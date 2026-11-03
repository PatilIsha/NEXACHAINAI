/**
 * Manually run the daily ROI job (idempotent).
 *   node src/scripts/runRoi.js            -> today
 *   node src/scripts/runRoi.js 2026-11-01 -> back-fill a specific business day
 */
const { connectDB, disconnectDB } = require('../config/db');
const { runDailyRoiJob } = require('../services/roi.service');

(async () => {
  const date = process.argv[2];
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error('Usage: node src/scripts/runRoi.js [YYYY-MM-DD]');
    process.exit(1);
  }
  await connectDB();
  try {
    const result = await runDailyRoiJob({ date: date || new Date(), trigger: 'script' });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await disconnectDB();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
