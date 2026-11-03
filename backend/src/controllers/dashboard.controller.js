const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const dashboardService = require('../services/dashboard.service');

const summary = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboardSummary(req.user._id);
  sendSuccess(res, { data });
});

module.exports = { summary };
