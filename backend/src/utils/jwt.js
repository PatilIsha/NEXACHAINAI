const jwt = require('jsonwebtoken');
const env = require('../config/env');

/** Issues an access token for a user. Payload is intentionally minimal (subject only). */
function signToken(user) {
  return jwt.sign({ sub: String(user._id) }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
    issuer: env.jwt.issuer,
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret, { issuer: env.jwt.issuer });
}

module.exports = { signToken, verifyToken };
