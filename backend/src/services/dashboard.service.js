/**
 * Dashboard service: headline numbers + chart series for the logged-in user.
 * Headline totals come from the denormalised User counters (O(1)); the rest are
 * small indexed aggregations run in parallel.
 */
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Investment = require('../models/Investment');
const RoiHistory = require('../models/RoiHistory');
const LevelIncome = require('../models/LevelIncome');
const ApiError = require('../utils/ApiError');
const { getDateKey, dateKeyToUtcDate, addDays } = require('../utils/dates');
const { round2 } = require('../utils/money');

const SERIES_DAYS = 30;

async function getDashboardSummary(userId) {
  const uid = new mongoose.Types.ObjectId(String(userId));
  const todayKey = getDateKey();
  const today = dateKeyToUtcDate(todayKey);
  const seriesStart = addDays(today, -(SERIES_DAYS - 1));

  const [user, investmentGroups, todayRoi, roiSeries, levelSeries, directReferrals] = await Promise.all([
    User.findById(uid)
      .select('fullName email referralCode walletBalance totalInvested totalRoiEarned totalLevelIncomeEarned createdAt')
      .lean(),
    Investment.aggregate([
      { $match: { user: uid } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
          dailyRoi: { $sum: { $multiply: ['$amount', { $divide: ['$dailyRoiPercent', 100] }] } },
          roiPaid: { $sum: '$totalRoiPaid' },
        },
      },
    ]),
    RoiHistory.aggregate([
      { $match: { user: uid, roiDate: today, status: 'credited' } },
      { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    RoiHistory.aggregate([
      { $match: { user: uid, status: 'credited', roiDate: { $gte: seriesStart } } },
      { $group: { _id: '$roiDate', amount: { $sum: '$amount' } } },
    ]),
    LevelIncome.aggregate([
      { $match: { user: uid, date: { $gte: addDays(seriesStart, -1) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: env.cron.timezone } },
          amount: { $sum: '$amount' },
        },
      },
    ]),
    User.countDocuments({ referredBy: uid }),
  ]);

  if (!user) throw ApiError.notFound('User not found');

  const byStatus = Object.fromEntries(investmentGroups.map((g) => [g._id, g]));
  const statusSummary = (s) => ({ count: byStatus[s]?.count || 0, amount: round2(byStatus[s]?.amount || 0) });
  const totalCount = investmentGroups.reduce((sum, g) => sum + g.count, 0);

  // Build a dense 30-day series (zero-filled) for the chart.
  const roiByDay = new Map(roiSeries.map((r) => [r._id.toISOString().slice(0, 10), r.amount]));
  const levelByDay = new Map(levelSeries.map((r) => [r._id, r.amount]));
  const earningsSeries = [];
  for (let i = 0; i < SERIES_DAYS; i += 1) {
    const key = addDays(seriesStart, i).toISOString().slice(0, 10);
    const roi = round2(roiByDay.get(key) || 0);
    const levelIncome = round2(levelByDay.get(key) || 0);
    earningsSeries.push({ date: key, roi, levelIncome, total: round2(roi + levelIncome) });
  }

  return {
    user: { id: user._id, fullName: user.fullName, email: user.email, referralCode: user.referralCode },
    cards: {
      totalInvestments: { count: totalCount, amount: round2(user.totalInvested) },
      dailyRoi: {
        expected: round2(byStatus.Active?.dailyRoi || 0),
        creditedToday: round2(todayRoi[0]?.amount || 0),
        date: todayKey,
      },
      totalRoiEarned: round2(user.totalRoiEarned),
      totalLevelIncome: round2(user.totalLevelIncomeEarned),
      walletBalance: round2(user.walletBalance),
    },
    investments: {
      active: statusSummary('Active'),
      completed: statusSummary('Completed'),
      cancelled: statusSummary('Cancelled'),
    },
    referrals: { direct: directReferrals },
    incomeBreakdown: [
      { key: 'roi', label: 'Daily ROI', value: round2(user.totalRoiEarned) },
      { key: 'levelIncome', label: 'Level income', value: round2(user.totalLevelIncomeEarned) },
    ],
    earningsSeries,
  };
}

module.exports = { getDashboardSummary };
