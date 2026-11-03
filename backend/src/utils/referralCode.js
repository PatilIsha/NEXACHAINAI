const crypto = require('crypto');

// No 0/O/1/I to avoid confusion when codes are shared verbally.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length = 6, prefix = 'NX') {
  const bytes = crypto.randomBytes(length);
  let code = prefix;
  for (let i = 0; i < length; i += 1) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

/**
 * Generates a referral code that does not yet exist. Collisions are very
 * unlikely (32^6 combinations) but we still verify against the DB.
 */
async function generateUniqueReferralCode(UserModel, attempts = 5) {
  for (let i = 0; i < attempts; i += 1) {
    const code = randomCode();
    // eslint-disable-next-line no-await-in-loop
    const exists = await UserModel.exists({ referralCode: code });
    if (!exists) return code;
  }
  throw new Error('Could not generate a unique referral code');
}

module.exports = { randomCode, generateUniqueReferralCode };
