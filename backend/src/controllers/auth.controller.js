const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const authService = require('../services/auth.service');

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  sendSuccess(res, { statusCode: 201, message: 'Registration successful', data });
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  sendSuccess(res, { message: 'Login successful', data });
});

const me = asyncHandler(async (req, res) => {
  const data = await authService.getProfile(req.user._id);
  sendSuccess(res, { data });
});

module.exports = { register, login, me };
