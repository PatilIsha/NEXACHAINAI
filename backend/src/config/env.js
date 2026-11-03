/**
 * Centralised, validated environment configuration.
 * Every other module reads config from here instead of touching process.env.
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env'), quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';

function required(key, fallback) {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parsePercentages(raw) {
  return String(raw)
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v >= 0);
}

const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT || 5000),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim()),

  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/nexachain'),
  useTransactions: process.env.USE_TRANSACTIONS !== 'false',

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'nexachain-api',
  },
  bcryptRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),

  cron: {
    enabled: process.env.CRON_ENABLED !== 'false',
    roiSchedule: process.env.ROI_CRON_SCHEDULE || '0 0 * * *',
    timezone: process.env.CRON_TIMEZONE || 'Asia/Kolkata',
    secret: process.env.CRON_SECRET || '',
  },

  levelIncome: {
    percentages: parsePercentages(process.env.LEVEL_INCOME_PERCENTAGES || '10,5,3,2,1'),
    requireActiveInvestment: process.env.LEVEL_INCOME_REQUIRE_ACTIVE_INVESTMENT === 'true',
  },
};

module.exports = env;
