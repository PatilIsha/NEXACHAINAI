const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const roiService = require('../services/roi.service');

/** Manually triggers the daily ROI job (idempotent - safe to call repeatedly). */
const runRoi = asyncHandler(async (req, res) => {
  const result = await roiService.runDailyRoiJob({ date: req.body.date, trigger: 'manual' });
  sendSuccess(res, {
    message: result.skipped ? `ROI job for ${result.runKey} skipped (${result.reason})` : `ROI job for ${result.runKey} completed`,
    data: result,
  });
});

const runs = asyncHandler(async (_req, res) => {
  const data = await roiService.listJobRuns();
  sendSuccess(res, { data });
});

module.exports = { runRoi, runs };
