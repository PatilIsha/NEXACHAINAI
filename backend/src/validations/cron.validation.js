const Joi = require('joi');

const runRoiSchema = Joi.object({
  // Optional business day to process (defaults to today). Useful for back-filling.
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({ 'string.pattern.base': 'date must be YYYY-MM-DD' }),
});

module.exports = { runRoiSchema };
