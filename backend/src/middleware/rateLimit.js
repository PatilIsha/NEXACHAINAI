const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const message = { success: false, message: 'Too many requests, please try again later' };

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
  skip: () => env.isTest,
});

// Tighter limit on credential endpoints to slow down brute force attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
  skip: () => env.isTest,
});

module.exports = { apiLimiter, authLimiter };
