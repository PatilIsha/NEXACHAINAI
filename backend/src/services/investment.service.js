/**
 * Investment service: plan lookup, investment creation (with referral payout)
 * and per-user listing.
 */
const mongoose = require('mongoose');
const { PLANS, getPlan } = require('../config/plans');
const User = require('../models/User');
const Investment = require('../models/Investment');
const ApiError = require('../utils/ApiError');
const { withTransaction } = require('../utils/transaction');
const { addDays } = require('../utils/dates');
const { round2, percentOf } = require('../utils/money');
const { paginationMeta } = require('../utils/response');
const levelIncomeService = require('./levelIncome.service');

const toObjectId = (id) => (id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id)));

/** Adds computed fields to a lean investment (virtuals are not applied by lean()). */
function withDerivedFields(investment) {
  const dailyRoiAmount = percentOf(investment.amount, investment.dailyRoiPercent);
  const progressPercent = Math.min(100, round2((investment.roiDaysPaid / investment.durationDays) * 100));
  return { ...investment, dailyRoiAmount, progressPercent };
}

function listPlans() {
  return PLANS;
}

/**
 * Creates an investment for a user and distributes level income to the upline
 * in the same transaction.
 *
 * Assumption: the principal is paid through an external payment channel, so
 * the wallet is NOT debited here. ROI accrues from the day after startDate for
 * `durationDays` days (endDate = startDate + durationDays).
 */
async function createInvestment({ userId, planCode, amount }) {
  const plan = getPlan(planCode);
  if (!plan) throw ApiError.badRequest(`Unknown plan: ${planCode}`);
  if (amount < plan.minAmount || amount > plan.maxAmount) {
    throw ApiError.badRequest(`Amount for ${plan.name} plan must be between ${plan.minAmount} and ${plan.maxAmount}`);
  }

  const user = await User.findById(userId).select('status').lean();
  if (!user) throw ApiError.notFound('User not found');
  if (user.status !== 'active') throw ApiError.forbidden(`Account is ${user.status}`);

  // Read-only traversal, done outside the transaction.
  const upline = await levelIncomeService.getUpline(userId);

  const startDate = new Date();
  const endDate = addDays(startDate, plan.durationDays);

  const result = await withTransaction(async (session) => {
    const [investment] = await Investment.create(
      [
        {
          user: toObjectId(userId),
          amount: round2(amount),
          plan,
          dailyRoiPercent: plan.dailyRoiPercent,
          durationDays: plan.durationDays,
          startDate,
          endDate,
          status: 'Active',
        },
      ],
      { session }
    );

    await User.updateOne({ _id: investment.user }, { $inc: { totalInvested: investment.amount } }, { session });

    const levelIncomes = await levelIncomeService.distributeLevelIncome({ investment, upline, session });
    investment.levelIncomeDistributed = true; // mirror the flag set by updateOne in the response
    return { investment, levelIncomes };
  });

  return {
    investment: result.investment.toJSON(),
    levelIncomeDistributed: result.levelIncomes.map((e) => ({ user: e.user, level: e.level, amount: e.amount })),
  };
}

/** Paginated investments for a user (newest first). */
async function listUserInvestments(userId, { page = 1, limit = 10, status } = {}) {
  const filter = { user: toObjectId(userId) };
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    Investment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Investment.countDocuments(filter),
  ]);

  return { items: items.map(withDerivedFields), meta: paginationMeta({ page, limit, total }) };
}

async function getUserInvestment(userId, investmentId) {
  const investment = await Investment.findOne({ _id: investmentId, user: toObjectId(userId) }).lean();
  if (!investment) throw ApiError.notFound('Investment not found');
  return withDerivedFields(investment);
}

module.exports = { listPlans, createInvestment, listUserInvestments, getUserInvestment };
