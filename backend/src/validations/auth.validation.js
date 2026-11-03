const Joi = require('joi');

const mobile = Joi.string()
  .trim()
  .pattern(/^\+?[0-9]{10,15}$/)
  .messages({ 'string.pattern.base': 'mobile must be 10-15 digits (optional leading +)' });

const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } });

const registerSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(80).required(),
  email: email.required(),
  mobile: mobile.required(),
  password: Joi.string().min(8).max(128).required(),
  referralCode: Joi.string().trim().uppercase().alphanum().min(4).max(20).allow('', null),
});

const loginSchema = Joi.object({
  email,
  mobile,
  password: Joi.string().required(),
}).or('email', 'mobile');

module.exports = { registerSchema, loginSchema };
