const router = require('express').Router();
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { createInvestmentSchema, listInvestmentsQuerySchema } = require('../validations/investment.validation');
const { objectIdParamSchema } = require('../validations/common.validation');
const controller = require('../controllers/investment.controller');

router.get('/plans', controller.listPlans);

router.use(protect);
router.post('/', validate(createInvestmentSchema), controller.create);
router.get('/', validate(listInvestmentsQuerySchema, 'query'), controller.list);
router.get('/:id', validate(objectIdParamSchema, 'params'), controller.getOne);

module.exports = router;
