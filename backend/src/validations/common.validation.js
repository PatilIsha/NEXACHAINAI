const Joi = require('joi');

const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const objectIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

module.exports = { paginationQuerySchema, objectIdParamSchema };
