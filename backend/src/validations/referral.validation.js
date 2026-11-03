const Joi = require('joi');

const treeQuerySchema = Joi.object({
  depth: Joi.number().integer().min(1).max(10).default(5),
});

module.exports = { treeQuerySchema };
