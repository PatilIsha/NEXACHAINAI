/**
 * Daily ROI engine.
 *
 * For every active investment, once per business calendar day:
 *   1. calculate ROI  = amount * dailyRoiPercent / 100
 *   2. store a RoiHistory row
 *   3. credit the user's wallet (+ totalRoiEarned)
 *   4. advance investment progress; mark Completed on the final day
 *
 * IDEMPOTENCY (the job may run twice, ROI must never be credited twice):
 *   Layer 1 - job lock: JobRun has a unique (jobName, runKey) index. The second
 *             run for the same day sees status=completed and exits immediately.
 *   Layer 2 - ledger guard: RoiHistory has a unique (investment, roiDate) index.
 *             Even if two workers bypass layer 1, the duplicate insert throws
 *             E11000 before any balance is touched.
 *
 * CONSISTENCY: each investment is processed in its own transaction
 * (withTransaction). On a standalone MongoDB (no transactions) the write order
 * is ledger -> investment -> wallet -> ledger=credited, with compensating
 * actions so a crash can never produce a double credit.
 */
const Investment = require('../models/Investment');
const RoiHistory = require('../models/RoiHistory');
const User = require('../models/User');
const JobRun = require('../models/JobRun');
const logger = require('../utils/logger');
const { withTransaction, isTransactionsEnabled } = require('../utils/transaction');
const { getDateKey, dateKeyToUtcDate, toRoiDate, addDays } = require('../utils/dates');
const { percentOf, round2 } = require('../utils/money');
const { paginationMeta } = require('../utils/response');

const JOB_NAME = 'daily-roi';
const STALE_LOCK_MS = 30 * 60 * 1000; // a "running" lock older than this is considered crashed
const BATCH_SIZE = 25; // investments processed concurrently

/* ------------------------------------------------------------------ */
/* Job lock                                                            */
/* ------------------------------------------------------------------ */

/**
 * Atomically claims the run for (jobName, runKey).
 * @returns {{acquired: boolean, run: JobRun, reason?: string}}
 */
async function acquireJobLock(jobName, runKey, trigger, attempt = 1) {
  try {
    const run = await JobRun.create({ jobName, runKey, trigger, status: 'running', startedAt: new Date() });
    return { acquired: true, run };
  } catch (err) {
    if (err.code !== 11000) throw err;
  }

  const existing = await JobRun.findOne({ jobName, runKey });
  if (!existing) {
    if (attempt >= 3) return { acquired: false, reason: 'lock-contended', run: null };
    return acquireJobLock(jobName, runKey, trigger, attempt + 1);
  }

  if (existing.status === 'completed') return { acquired: false, reason: 'already-completed', run: existing };

  const isStale = Date.now() - new Date(existing.startedAt).getTime() > STALE_LOCK_MS;
  if (existing.status === 'running' && !isStale) return { acquired: false, reason: 'already-running', run: existing };

  // Previous attempt failed or crashed: take the lock over (guarded by the old status/startedAt).
  const taken = await JobRun.findOneAndUpdate(
    { _id: existing._id, status: existing.status, startedAt: existing.startedAt },
    {
      $set: { status: 'running', trigger, startedAt: new Date(), finishedAt: null, error: null },
      $inc: { attempts: 1 },
    },
    { new: true }
  );
  if (!taken) return { acquired: false, reason: 'lock-contended', run: existing };
  return { acquired: true, run: taken };
}

/* ------------------------------------------------------------------ */
/* Per-investment credit                                               */
/* ------------------------------------------------------------------ */

/**
 * Compensating action for the non-transactional fallback. In transaction mode
 * the abort already rolled everything back and these calls are no-ops.
 */
async function compensate(historyId, stage, err) {
  if (!historyId) return;
  if (stage === 'investment') {
    // Nothing was credited yet: remove the pending ledger row so the day can be retried.
    await RoiHistory.deleteOne({ _id: historyId, status: 'pending' });
    return;
  }
  // Investment progressed but wallet/finalise failed: keep an auditable failed row (manual review).
  await RoiHistory.updateOne(
    { _id: historyId, status: 'pending' },
    { $set: { status: 'failed', error: `${stage}: ${err.message}` } }
  );
}

/**
 * Credits one day of ROI to a single investment.
 * @param {Object} investment - lean investment document
 * @param {Date}   roiDate    - business day (UTC midnight) being processed
 * @returns {{outcome: 'credited'|'completed'|'duplicate'|'skipped'|'failed', amount?: number, reason?: string}}
 */
async function creditDailyRoi(investment, roiDate) {
  const firstRoiDay = addDays(toRoiDate(investment.startDate), 1); // ROI starts the day after investing
  const lastRoiDay = toRoiDate(investment.endDate);

  if (roiDate < firstRoiDay) return { outcome: 'skipped', reason: 'not-started' };

  if (roiDate > lastRoiDay) {
    // Term is over (e.g. missed days were never back-filled): close it without crediting.
    await Investment.updateOne(
      { _id: investment._id, status: 'Active' },
      { $set: { status: 'Completed', completedAt: new Date() } }
    );
    return { outcome: 'skipped', reason: 'term-ended' };
  }

  const amount = percentOf(investment.amount, investment.dailyRoiPercent);
  const isFinalDay = roiDate.getTime() === lastRoiDay.getTime() || investment.roiDaysPaid + 1 >= investment.durationDays;

  let historyId = null;
  let stage = 'insert';

  try {
    await withTransaction(async (session) => {
      // 1. Ledger row first - the unique index is the idempotency guard.
      stage = 'insert';
      const [history] = await RoiHistory.create(
        [{ user: investment.user, investment: investment._id, amount, roiDate, status: 'pending' }],
        { session }
      );
      historyId = history._id;

      // 2. Advance the investment (only if still Active).
      stage = 'investment';
      const update = { $inc: { totalRoiPaid: amount, roiDaysPaid: 1 }, $set: { lastRoiDate: roiDate } };
      if (isFinalDay) {
        update.$set.status = 'Completed';
        update.$set.completedAt = new Date();
      }
      const res = await Investment.updateOne({ _id: investment._id, status: 'Active' }, update, { session });
      if (res.matchedCount === 0) {
        const e = new Error('Investment is no longer active');
        e.code = 'NOT_ACTIVE';
        throw e;
      }

      // 3. Credit the wallet.
      stage = 'wallet';
      await User.updateOne(
        { _id: investment.user },
        { $inc: { walletBalance: amount, totalRoiEarned: amount } },
        { session }
      );

      // 4. Mark the ledger row as credited.
      stage = 'finalise';
      await RoiHistory.updateOne({ _id: historyId }, { $set: { status: 'credited', date: new Date() } }, { session });
    });

    return { outcome: isFinalDay ? 'completed' : 'credited', amount };
  } catch (err) {
    if (err.code === 11000) return { outcome: 'duplicate', amount: 0 };
    await compensate(historyId, stage, err);
    if (err.code === 'NOT_ACTIVE') return { outcome: 'skipped', reason: 'not-active' };
    logger.error(`ROI credit failed for investment ${investment._id}`, err);
    return { outcome: 'failed', error: err.message };
  }
}

/* ------------------------------------------------------------------ */
/* Job runner                                                          */
/* ------------------------------------------------------------------ */

function applyOutcome(stats, result) {
  switch (result.outcome) {
    case 'credited':
      stats.credited += 1;
      stats.totalAmount = round2(stats.totalAmount + result.amount);
      break;
    case 'completed':
      stats.credited += 1;
      stats.completed += 1;
      stats.totalAmount = round2(stats.totalAmount + result.amount);
      break;
    case 'duplicate':
      stats.duplicates += 1;
      break;
    case 'skipped':
      stats.skipped += 1;
      break;
    default:
      stats.failed += 1;
  }
}

/**
 * Runs the daily ROI job for one business day.
 *
 * @param {Object} [options]
 * @param {Date|string} [options.date]   - Date or 'YYYY-MM-DD' business day (default: today)
 * @param {'cron'|'manual'|'script'} [options.trigger]
 * @returns {Promise<{runKey: string, skipped: boolean, reason?: string, stats?: Object}>}
 */
async function runDailyRoiJob({ date = new Date(), trigger = 'cron' } = {}) {
  const runKey = typeof date === 'string' ? date : getDateKey(date);
  const roiDate = dateKeyToUtcDate(runKey);

  const lock = await acquireJobLock(JOB_NAME, runKey, trigger);
  if (!lock.acquired) {
    logger.info(`ROI job for ${runKey} skipped: ${lock.reason}`);
    return { runKey, skipped: true, reason: lock.reason, run: lock.run };
  }

  const stats = { scanned: 0, credited: 0, completed: 0, duplicates: 0, skipped: 0, failed: 0, totalAmount: 0 };
  const startedAt = Date.now();
  logger.info(`ROI job for ${runKey} started (trigger=${trigger}, transactions=${isTransactionsEnabled()})`);

  try {
    // Coarse pre-filter; exact day eligibility is decided in creditDailyRoi.
    const cursor = Investment.find({ status: 'Active', startDate: { $lt: addDays(roiDate, 1) } })
      .lean()
      .cursor();

    let batch = [];
    const flush = async () => {
      const results = await Promise.all(batch.map((inv) => creditDailyRoi(inv, roiDate)));
      results.forEach((r) => applyOutcome(stats, r));
      batch = [];
    };

    for await (const investment of cursor) {
      stats.scanned += 1;
      batch.push(investment);
      if (batch.length >= BATCH_SIZE) await flush();
    }
    if (batch.length) await flush();

    const durationMs = Date.now() - startedAt;
    await JobRun.updateOne(
      { _id: lock.run._id },
      { $set: { status: 'completed', finishedAt: new Date(), durationMs, stats } }
    );
    logger.info(`ROI job for ${runKey} completed in ${durationMs}ms`, stats);
    return { runKey, skipped: false, stats, durationMs, transactional: isTransactionsEnabled() };
  } catch (err) {
    await JobRun.updateOne(
      { _id: lock.run._id },
      { $set: { status: 'failed', finishedAt: new Date(), durationMs: Date.now() - startedAt, error: err.message, stats } }
    );
    logger.error(`ROI job for ${runKey} failed`, err);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

/** Paginated ROI history for a user. */
async function listRoiHistory(userId, { page = 1, limit = 10 } = {}) {
  const filter = { user: userId };
  const [items, total] = await Promise.all([
    RoiHistory.find(filter)
      .sort({ roiDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('investment', 'amount plan.name dailyRoiPercent')
      .lean(),
    RoiHistory.countDocuments(filter),
  ]);
  return { items, meta: paginationMeta({ page, limit, total }) };
}

/** Recent job runs (for monitoring / the manual trigger UI). */
async function listJobRuns({ limit = 20 } = {}) {
  return JobRun.find({ jobName: JOB_NAME }).sort({ startedAt: -1 }).limit(limit).lean();
}

module.exports = { JOB_NAME, runDailyRoiJob, creditDailyRoi, acquireJobLock, listRoiHistory, listJobRuns };
