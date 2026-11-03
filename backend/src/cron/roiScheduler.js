/**
 * node-cron scheduler for the daily ROI job.
 *
 * Runs every day at 12:00 AM in CRON_TIMEZONE (default "0 0 * * *", Asia/Kolkata).
 * Safeguards against duplicate processing:
 *   - noOverlap: a tick is skipped while the previous one is still running
 *   - runDailyRoiJob is idempotent (JobRun lock + unique RoiHistory index),
 *     so an extra invocation (restart, two instances, manual trigger) is harmless.
 */
const cron = require('node-cron');
const env = require('../config/env');
const logger = require('../utils/logger');
const { runDailyRoiJob } = require('../services/roi.service');

let task = null;

async function tick() {
  try {
    const result = await runDailyRoiJob({ trigger: 'cron' });
    if (result.skipped) logger.info(`[cron] ROI ${result.runKey} skipped: ${result.reason}`);
    else logger.info(`[cron] ROI ${result.runKey} done`, result.stats);
  } catch (err) {
    logger.error('[cron] ROI job failed', err);
  }
}

function startRoiScheduler() {
  if (!env.cron.enabled) {
    logger.info('[cron] ROI scheduler disabled (CRON_ENABLED=false)');
    return null;
  }
  if (!cron.validate(env.cron.roiSchedule)) {
    throw new Error(`Invalid ROI_CRON_SCHEDULE: "${env.cron.roiSchedule}"`);
  }
  if (task) return task;

  task = cron.schedule(env.cron.roiSchedule, tick, {
    name: 'daily-roi',
    timezone: env.cron.timezone,
    noOverlap: true,
  });

  logger.info(`[cron] ROI scheduler started: "${env.cron.roiSchedule}" (${env.cron.timezone})`);
  return task;
}

function stopRoiScheduler() {
  if (!task) return;
  task.stop();
  task.destroy();
  task = null;
  logger.info('[cron] ROI scheduler stopped');
}

module.exports = { startRoiScheduler, stopRoiScheduler, tick };
