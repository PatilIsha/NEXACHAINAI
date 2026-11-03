/**
 * Calendar-day helpers used by the ROI engine.
 *
 * ROI is credited once per calendar day in the configured business timezone
 * (CRON_TIMEZONE). A "date key" is that day as YYYY-MM-DD; it is persisted as a
 * UTC-midnight Date so it can be indexed and compared consistently regardless
 * of the server timezone.
 */
const env = require('../config/env');

const DAY_MS = 24 * 60 * 60 * 1000;

function getDateKey(date = new Date(), timeZone = env.cron.timezone) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** YYYY-MM-DD -> Date at 00:00:00.000Z */
function dateKeyToUtcDate(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error(`Invalid date key: ${key}`);
  return new Date(`${key}T00:00:00.000Z`);
}

/** Normalises any Date to the UTC-midnight representation of its business calendar day. */
function toRoiDate(date = new Date()) {
  return dateKeyToUtcDate(getDateKey(date));
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

module.exports = { DAY_MS, getDateKey, dateKeyToUtcDate, toRoiDate, addDays };
