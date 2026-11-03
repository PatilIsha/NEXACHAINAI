const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const referralService = require('../services/referral.service');
const levelIncomeService = require('../services/levelIncome.service');

const direct = asyncHandler(async (req, res) => {
  const { items, meta } = await referralService.getDirectReferrals(req.user._id, req.query);
  sendSuccess(res, { data: items, meta });
});

const tree = asyncHandler(async (req, res) => {
  const data = await referralService.getReferralTree(req.user._id, req.query.depth);
  sendSuccess(res, { data });
});

const income = asyncHandler(async (req, res) => {
  const { items, meta } = await levelIncomeService.listLevelIncome(req.user._id, req.query);
  sendSuccess(res, { data: items, meta });
});

module.exports = { direct, tree, income };
