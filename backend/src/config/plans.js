/**
 * Investment plans. A snapshot of the chosen plan is stored on each investment
 * so that later changes to this table never alter existing investments.
 */
const PLANS = [
  { code: 'STARTER', name: 'Starter', minAmount: 100, maxAmount: 999, dailyRoiPercent: 1, durationDays: 30 },
  { code: 'GROWTH', name: 'Growth', minAmount: 1000, maxAmount: 4999, dailyRoiPercent: 1.5, durationDays: 60 },
  { code: 'PREMIUM', name: 'Premium', minAmount: 5000, maxAmount: 100000, dailyRoiPercent: 2, durationDays: 90 },
];

const getPlan = (code) => PLANS.find((p) => p.code === String(code || '').toUpperCase()) || null;

module.exports = { PLANS, getPlan };
