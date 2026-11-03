const ApiError = require('../utils/ApiError');

/**
 * Validates req[property] against a Joi schema. Unknown keys are stripped and
 * the sanitised value replaces the original so controllers get typed input.
 */
const validate = (schema, property = 'body') => (req, _res, next) => {
  const { error, value } = schema.validate(req[property] ?? {}, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/"/g, ''),
    }));
    return next(ApiError.unprocessable('Validation failed', details));
  }

  req[property] = value;
  return next();
};

module.exports = { validate };
