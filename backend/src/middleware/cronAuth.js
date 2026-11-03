const crypto = require('crypto');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/** Guards the manual cron trigger endpoints with a shared secret header (x-cron-secret). */
function cronAuth(req, _res, next) {
  if (!env.cron.secret) {
    return next(ApiError.forbidden('Manual cron trigger is disabled (CRON_SECRET not configured)'));
  }
  const provided = req.headers['x-cron-secret'];
  if (!provided || !safeEqual(provided, env.cron.secret)) {
    return next(ApiError.unauthorized('Invalid cron secret'));
  }
  return next();
}

module.exports = { cronAuth };
