/**
 * withTransaction(fn)
 *
 * Runs `fn(session)` inside a MongoDB multi-document transaction so that a
 * group of writes either all commit or all roll back.
 *
 * Transactions need a replica set (MongoDB Atlas, or a local `--replSet`).
 * On a standalone server the first attempt fails with a well-known error; we
 * then permanently fall back to running `fn(null)` without a session. Callers
 * are written so that the fallback path is still idempotent (unique indexes +
 * compensating actions) - see roi.service.js.
 */
const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('./logger');

let transactionsSupported = env.useTransactions;

function isTransactionUnsupported(err) {
  if (!err) return false;
  const msg = String(err.message || '');
  return (
    err.code === 20 || // IllegalOperation
    err.codeName === 'IllegalOperation' ||
    /Transaction numbers are only allowed/i.test(msg) ||
    /does not support retryable writes/i.test(msg) ||
    /replica set/i.test(msg) ||
    /transactions are not supported/i.test(msg)
  );
}

async function withTransaction(fn) {
  if (!transactionsSupported) return fn(null);

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err) {
    if (isTransactionUnsupported(err)) {
      transactionsSupported = false;
      logger.warn(
        'MongoDB transactions are unavailable (standalone server). Falling back to non-transactional writes guarded by unique indexes.'
      );
      return fn(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

const isTransactionsEnabled = () => transactionsSupported;

module.exports = { withTransaction, isTransactionsEnabled };
