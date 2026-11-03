const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const roiService = require('../services/roi.service');

const history = asyncHandler(async (req, res) => {
  const { items, meta } = await roiService.listRoiHistory(req.user._id, req.query);
  sendSuccess(res, { data: items, meta });
});

module.exports = { history };
