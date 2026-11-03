/**
 * Idempotency check for the daily ROI job. Uses a throw-away database
 * (<MONGO_URI>_idempotency_test) and exits non-zero on failure.
 *
 * Scenarios:
 *   1. Sequential double run for the same day  -> second run is skipped, no extra credit
 *   2. Concurrent double run for another day   -> exactly one run acquires the lock
 *   3. Direct creditDailyRoi() called twice     -> second call reports "duplicate"
 */
const mongoose = require('mongoose');
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const { User, Investment, RoiHistory, JobRun } = require('../models');
const { runDailyRoiJob, creditDailyRoi } = require('../services/roi.service');
const { getPlan } = require('../config/plans');
const { addDays, dateKeyToUtcDate, getDateKey } = require('../utils/dates');

const assert = (cond, msg) => {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ok - ${msg}`);
};

(async () => {
  const uri = env.mongoUri.replace(/(\/[^/?]+)(\?.*)?$/, '$1_idempotency_test$2');
  await connectDB(uri);
  await mongoose.connection.dropDatabase();
  await Promise.all([User.syncIndexes(), Investment.syncIndexes(), RoiHistory.syncIndexes(), JobRun.syncIndexes()]);

  const plan = getPlan('STARTER');
  const user = await User.create({
    fullName: 'Idempotency Tester',
    email: 'idem@example.com',
    mobile: '9000000001',
    password: 'Password123',
    referralCode: 'NXTEST1',
  });
  const startDate = addDays(new Date(), -3);
  const investment = await Investment.create({
    user: user._id,
    amount: 500,
    plan,
    dailyRoiPercent: plan.dailyRoiPercent,
    durationDays: plan.durationDays,
    startDate,
    endDate: addDays(startDate, plan.durationDays),
  });
  const expectedDaily = 5; // 500 * 1%

  console.log('\nScenario 1: run the job twice for today');
  const today = getDateKey();
  const first = await runDailyRoiJob({ date: today, trigger: 'script' });
  const second = await runDailyRoiJob({ date: today, trigger: 'script' });
  let u = await User.findById(user._id).lean();
  assert(first.skipped === false && first.stats.credited === 1, 'first run credits once');
  assert(second.skipped === true && second.reason === 'already-completed', 'second run is skipped by job lock');
  assert(u.walletBalance === expectedDaily, `wallet credited exactly once (${u.walletBalance})`);
  assert((await RoiHistory.countDocuments({ investment: investment._id })) === 1, 'exactly one ROI history row');

  console.log('\nScenario 2: two concurrent runs for yesterday');
  const yesterday = getDateKey(addDays(new Date(), -1));
  const [a, b] = await Promise.all([
    runDailyRoiJob({ date: yesterday, trigger: 'script' }),
    runDailyRoiJob({ date: yesterday, trigger: 'script' }),
  ]);
  const ran = [a, b].filter((r) => !r.skipped);
  u = await User.findById(user._id).lean();
  assert(ran.length === 1, 'only one of the concurrent runs acquired the lock');
  assert(u.walletBalance === expectedDaily * 2, `wallet now holds two days of ROI (${u.walletBalance})`);
  assert((await RoiHistory.countDocuments({ investment: investment._id })) === 2, 'two ROI history rows');

  console.log('\nScenario 3: creditDailyRoi() called twice for the same day (bypassing the job lock)');
  const twoDaysAgo = dateKeyToUtcDate(getDateKey(addDays(new Date(), -2)));
  const inv = await Investment.findById(investment._id).lean();
  const r1 = await creditDailyRoi(inv, twoDaysAgo);
  const r2 = await creditDailyRoi(inv, twoDaysAgo);
  u = await User.findById(user._id).lean();
  assert(r1.outcome === 'credited', 'first direct credit succeeds');
  assert(r2.outcome === 'duplicate', 'second direct credit rejected by unique index');
  assert(u.walletBalance === expectedDaily * 3, `wallet holds exactly three days of ROI (${u.walletBalance})`);
  assert(u.totalRoiEarned === expectedDaily * 3, 'totalRoiEarned matches');
  const finalInv = await Investment.findById(investment._id).lean();
  assert(finalInv.roiDaysPaid === 3 && finalInv.totalRoiPaid === expectedDaily * 3, 'investment progress is consistent');

  console.log('\nPASS: ROI processing is idempotent');
  await mongoose.connection.dropDatabase();
  await disconnectDB();
  process.exit(0);
})().catch(async (err) => {
  console.error('\nFAIL:', err.message);
  try { await disconnectDB(); } catch (_) { /* ignore */ }
  process.exit(1);
});
