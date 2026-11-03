const router = require('express').Router();
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { paginationQuerySchema } = require('../validations/common.validation');
const { treeQuerySchema } = require('../validations/referral.validation');
const controller = require('../controllers/referral.controller');

router.use(protect);
router.get('/direct', validate(paginationQuerySchema, 'query'), controller.direct);
router.get('/tree', validate(treeQuerySchema, 'query'), controller.tree);
router.get('/income', validate(paginationQuerySchema, 'query'), controller.income);

module.exports = router;
