/**
 * Demo data seeder.
 *   node src/scripts/seed.js          -> adds demo data (fails if users already exist)
 *   node src/scripts/seed.js --reset  -> wipes the database first
 *
 * Creates a 6-level referral chain, backdated investments and back-fills the
 * last 10 days of ROI through the real job (so idempotency + ledgers are exercised).
 */
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { User, Investment, LevelIncome, RoiHistory, JobRun } = require('../models');
const investmentService = require('../services/investment.service');
const { runDailyRoiJob } = require('../services/roi.service');
const { addDays, getDateKey } = require('../utils/dates');

const PASSWORD = 'Password@123';
const DAYS_OF_HISTORY = 10;

// [fullName, email, mobile, referralCode, sponsorCode]
const USERS = [
  ['Aarav Sharma', 'aarav@example.com', '9876543210', 'NXAARAV', null],
  ['Priya Verma', 'priya@example.com', '9876543211', 'NXPRIYA', 'NXAARAV'],
  ['Rohan Mehta', 'rohan@example.com', '9876543212', 'NXROHAN', 'NXAARAV'],
  ['Neha Singh', 'neha@example.com', '9876543213', 'NXNEHA', 'NXPRIYA'],
  ['Karan Gupta', 'karan@example.com', '9876543214', 'NXKARAN', 'NXPRIYA'],
  ['Vikram Rao', 'vikram@example.com', '9876543215', 'NXVIKRAM', 'NXNEHA'],
  ['Sneha Iyer', 'sneha@example.com', '9876543216', 'NXSNEHA', 'NXVIKRAM'],
  ['Arjun Nair', 'arjun@example.com', '9876543217', 'NXARJUN', 'NXSNEHA'],
  ['Meera Das', 'meera@example.com', '9876543218', 'NXMEERA', 'NXARJUN'],
];

// [email, planCode, amount, daysAgo]
const INVESTMENTS = [
  ['aarav@example.com', 'PREMIUM', 10000, 9],
  ['priya@example.com', 'GROWTH', 2500, 8],
  ['rohan@example.com', 'STARTER', 500, 7],
  ['neha@example.com', 'GROWTH', 1500, 6],
  ['karan@example.com', 'STARTER', 800, 5],
  ['vikram@example.com', 'PREMIUM', 6000, 4],
  ['sneha@example.com', 'STARTER', 300, 3],
  ['arjun@example.com', 'GROWTH', 1200, 2],
  ['meera@example.com', 'STARTER', 250, 1],
  ['aarav@example.com', 'STARTER', 400, 0],
];

async function main() {
  const reset = process.argv.includes('--reset');
  await connectDB();

  if (reset) {
    await Promise.all([User, Investment, LevelIncome, RoiHistory, JobRun].map((m) => m.deleteMany({})));
    console.log('Database cleared');
  } else if (await User.exists({})) {
    throw new Error('Users already exist. Re-run with --reset to wipe the database first.');
  }
  await Promise.all([User, Investment, LevelIncome, RoiHistory, JobRun].map((m) => m.syncIndexes()));

  // 1. Users (sequential so sponsors exist before their referrals)
  const byCode = new Map();
  for (const [fullName, email, mobile, referralCode, sponsorCode] of USERS) {
    const user = await User.create({
      fullName,
      email,
      mobile,
      password: PASSWORD,
      referralCode,
      referredBy: sponsorCode ? byCode.get(sponsorCode)._id : null,
    });
    byCode.set(referralCode, user);
  }
  const byEmail = new Map([...byCode.values()].map((u) => [u.email, u]));
  console.log(`Created ${USERS.length} users`);

  // 2. Investments (through the service so level income is distributed), then backdated
  for (const [email, planCode, amount, daysAgo] of INVESTMENTS) {
    const { investment } = await investmentService.createInvestment({ userId: byEmail.get(email)._id, planCode, amount });
    if (daysAgo > 0) {
      const startDate = addDays(new Date(), -daysAgo);
      await Investment.updateOne(
        { _id: investment._id },
        { $set: { startDate, endDate: addDays(startDate, investment.durationDays), createdAt: startDate } }
      );
      await LevelIncome.updateMany({ investment: investment._id }, { $set: { date: startDate, createdAt: startDate } });
    }
  }
  console.log(`Created ${INVESTMENTS.length} investments (+ level income)`);

  // 3. Back-fill daily ROI through the real idempotent job
  for (let d = DAYS_OF_HISTORY; d >= 0; d -= 1) {
    const key = getDateKey(addDays(new Date(), -d));
    const r = await runDailyRoiJob({ date: key, trigger: 'script' });
    console.log(`ROI ${key}: ${r.skipped ? `skipped (${r.reason})` : `credited ${r.stats.credited}, skipped ${r.stats.skipped}`}`);
  }

  console.log('\nDemo accounts (password for all: %s)', PASSWORD);
  console.table(USERS.map(([name, email, , code, sponsor]) => ({ name, email, referralCode: code, sponsor: sponsor || '-' })));
}

main()
  .then(() => disconnectDB())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err);
    await disconnectDB();
    process.exit(1);
  });
