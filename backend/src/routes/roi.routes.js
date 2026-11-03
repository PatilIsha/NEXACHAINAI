const router = require('express').Router();
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { paginationQuerySchema } = require('../validations/common.validation');
const controller = require('../controllers/roi.controller');

router.get('/history', protect, validate(paginationQuerySchema, 'query'), controller.history);

module.exports = router;
