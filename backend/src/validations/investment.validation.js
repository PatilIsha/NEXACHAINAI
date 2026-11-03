const Joi = require('joi');
const { paginationQuerySchema } = require('./common.validation');

const createInvestmentSchema = Joi.object({
  planCode: Joi.string().trim().uppercase().required(),
  amount: Joi.number().positive().precision(2).required(),
});

const listInvestmentsQuerySchema = paginationQuerySchema.keys({
  status: Joi.string().valid('Active', 'Completed', 'Cancelled'),
});

module.exports = { createInvestmentSchema, listInvestmentsQuerySchema };
