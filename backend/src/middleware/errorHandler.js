const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

/** Converts any thrown error into a consistent JSON error response. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let error = err;

  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid value for ${err.path}`);
  } else if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`${field} already exists`);
  } else if (err.name === 'ValidationError' && err.errors) {
    error = ApiError.unprocessable(
      'Validation failed',
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
    );
  } else if (err.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Malformed JSON body');
  } else if (!(err instanceof ApiError)) {
    error = new ApiError(err.statusCode || err.status || 500, env.isProd ? 'Internal server error' : err.message);
  }

  if (error.statusCode >= 500) logger.error(`${req.method} ${req.originalUrl}`, err);

  const body = { success: false, message: error.message };
  if (error.details) body.errors = error.details;
  if (!env.isProd && error.statusCode >= 500) body.stack = err.stack;

  res.status(error.statusCode).json(body);
}

module.exports = { notFound, errorHandler };
