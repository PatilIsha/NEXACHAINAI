const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * JWT guard for private routes.
 * Expects `Authorization: Bearer <token>`; loads a lightweight user record onto req.user.
 */
const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication required: missing Bearer token');
  }

  let payload;
  try {
    payload = verifyToken(header.slice(7).trim());
  } catch (err) {
    throw ApiError.unauthorized(err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token');
  }

  const user = await User.findById(payload.sub).select('fullName email referralCode status').lean();
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (user.status !== 'active') throw ApiError.forbidden(`Account is ${user.status}`);

  req.user = user;
  return next();
});

module.exports = { protect };
