/**
 * Referral / level income service.
 *
 * When a user invests, a percentage of the investment amount is paid to each
 * upline sponsor: level 1 (direct sponsor) gets percentages[0], level 2 gets
 * percentages[1], and so on (default 10 / 5 / 3 / 2 / 1 %).
 *
 * Duplicate protection:
 *  - unique index on LevelIncome (investment, user, level)
 *  - Investment.levelIncomeDistributed flag
 */
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Investment = require('../models/Investment');
const LevelIncome = require('../models/LevelIncome');
const { percentOf, round2 } = require('../utils/money');
const { paginationMeta } = require('../utils/response');

const PERCENTAGES = env.levelIncome.percentages;
const MAX_LEVELS = PERCENTAGES.length;

const toObjectId = (id) => (id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id)));

/**
 * Walks up the referral chain from `userId` in a single $graphLookup query.
 * Returns [{ _id, fullName, status, level }] ordered by level (1 = direct sponsor).
 */
async function getUpline(userId, maxLevels = MAX_LEVELS) {
  if (maxLevels < 1) return [];
  const [result] = await User.aggregate([
    { $match: { _id: toObjectId(userId) } },
    {
      $graphLookup: {
        from: User.collection.name,
        startWith: '$referredBy',
        connectFromField: 'referredBy',
        connectToField: '_id',
        as: 'upline',
        maxDepth: maxLevels - 1,
        depthField: 'depth',
      },
    },
    { $project: { 'upline._id': 1, 'upline.fullName': 1, 'upline.status': 1, 'upline.depth': 1 } },
  ]);

  return (result?.upline || [])
    .map((u) => ({ _id: u._id, fullName: u.fullName, status: u.status, level: u.depth + 1 }))
    .sort((a, b) => a.level - b.level);
}

/**
 * Determines which upline users may receive level income.
 * Rule: account must be active; optionally must also hold an active investment.
 */
async function filterEligible(upline) {
  let eligible = upline.filter((u) => u.status === 'active');
  if (env.levelIncome.requireActiveInvestment && eligible.length) {
    const withActive = await Investment.distinct('user', {
      user: { $in: eligible.map((u) => u._id) },
      status: 'Active',
    });
    const allowed = new Set(withActive.map(String));
    eligible = eligible.filter((u) => allowed.has(String(u._id)));
  }
  return eligible;
}

/**
 * Builds the level income entries for an investment without writing anything.
 * Pure function - handy for previews and tests.
 */
function calculateLevelIncome(investment, eligibleUpline) {
  const entries = [];
  for (const sponsor of eligibleUpline) {
    const percentage = PERCENTAGES[sponsor.level - 1];
    if (!percentage) continue;
    const amount = percentOf(investment.amount, percentage);
    if (amount <= 0) continue;
    entries.push({
      user: sponsor._id,
      fromUser: investment.user,
      investment: investment._id,
      level: sponsor.level,
      percentage,
      amount,
      date: new Date(),
      status: 'credited',
    });
  }
  return entries;
}

/**
 * Credits level income for a freshly created investment.
 * Must be called with the same `session` as the investment insert so that the
 * investment and its referral payouts commit (or roll back) together.
 *
 * @param {Object} params
 * @param {Object} params.investment - the created investment document (or lean object)
 * @param {Array}  [params.upline]   - pre-fetched upline (fetched here if omitted)
 * @param {ClientSession|null} params.session
 * @returns {Array} level income entries that were credited
 */
async function distributeLevelIncome({ investment, upline, session = null }) {
  const chain = upline ?? (await getUpline(investment.user));
  const eligible = await filterEligible(chain);
  const entries = calculateLevelIncome(investment, eligible);

  if (entries.length) {
    // 1. ledger rows (unique index protects against double distribution)
    await LevelIncome.insertMany(entries, { session, ordered: true });
    // 2. wallet credits, one bulk round-trip
    await User.bulkWrite(
      entries.map((e) => ({
        updateOne: {
          filter: { _id: e.user },
          update: { $inc: { walletBalance: e.amount, totalLevelIncomeEarned: e.amount } },
        },
      })),
      { session, ordered: true }
    );
  }

  await Investment.updateOne({ _id: investment._id }, { $set: { levelIncomeDistributed: true } }, { session });
  return entries;
}

/** Paginated level income history for a receiver. */
async function listLevelIncome(userId, { page = 1, limit = 10 } = {}) {
  const filter = { user: toObjectId(userId) };
  const [items, total] = await Promise.all([
    LevelIncome.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('fromUser', 'fullName referralCode')
      .populate('investment', 'amount plan.name')
      .lean(),
    LevelIncome.countDocuments(filter),
  ]);
  return { items: items.map((i) => ({ ...i, amount: round2(i.amount) })), meta: paginationMeta({ page, limit, total }) };
}

module.exports = {
  PERCENTAGES,
  MAX_LEVELS,
  getUpline,
  filterEligible,
  calculateLevelIncome,
  distributeLevelIncome,
  listLevelIncome,
};
