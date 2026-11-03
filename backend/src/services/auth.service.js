/**
 * Authentication service: registration, login and profile lookup.
 */
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/jwt');
const { generateUniqueReferralCode } = require('../utils/referralCode');

/**
 * Registers a new user. If a referral code is supplied the new user is placed
 * under that sponsor in the referral tree.
 */
async function register({ fullName, email, mobile, password, referralCode }) {
  const [emailTaken, mobileTaken] = await Promise.all([User.exists({ email }), User.exists({ mobile })]);
  if (emailTaken) throw ApiError.conflict('Email is already registered');
  if (mobileTaken) throw ApiError.conflict('Mobile number is already registered');

  let referredBy = null;
  if (referralCode) {
    const sponsor = await User.findOne({ referralCode: referralCode.toUpperCase() }).select('_id status').lean();
    if (!sponsor) throw ApiError.badRequest('Invalid referral code');
    if (sponsor.status !== 'active') throw ApiError.badRequest('Referral code belongs to an inactive account');
    referredBy = sponsor._id;
  }

  const user = await User.create({
    fullName,
    email,
    mobile,
    password, // hashed by the model pre-save hook
    referralCode: await generateUniqueReferralCode(User),
    referredBy,
  });

  return { user: user.toJSON(), token: signToken(user) };
}

/** Logs in with email or mobile + password. */
async function login({ email, mobile, password }) {
  const user = await User.findOne(email ? { email } : { mobile }).select('+password');

  // Same message for unknown user and wrong password (no user enumeration).
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid credentials');
  }
  if (user.status !== 'active') throw ApiError.forbidden(`Account is ${user.status}`);

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

  return { user: user.toJSON(), token: signToken(user) };
}

/** Returns the authenticated user's profile including sponsor summary. */
async function getProfile(userId) {
  const user = await User.findById(userId)
    .populate('referredBy', 'fullName referralCode')
    .lean();
  if (!user) throw ApiError.notFound('User not found');
  delete user.password;
  return user;
}

module.exports = { register, login, getProfile };
