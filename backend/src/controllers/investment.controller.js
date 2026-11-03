const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const investmentService = require('../services/investment.service');

const listPlans = asyncHandler(async (_req, res) => {
  sendSuccess(res, { data: investmentService.listPlans() });
});

const create = asyncHandler(async (req, res) => {
  const data = await investmentService.createInvestment({ userId: req.user._id, ...req.body });
  sendSuccess(res, { statusCode: 201, message: 'Investment created', data });
});

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await investmentService.listUserInvestments(req.user._id, req.query);
  sendSuccess(res, { data: items, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const data = await investmentService.getUserInvestment(req.user._id, req.params.id);
  sendSuccess(res, { data });
});

module.exports = { listPlans, create, list, getOne };
