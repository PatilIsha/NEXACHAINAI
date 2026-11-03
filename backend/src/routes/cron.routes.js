const router = require('express').Router();
const { validate } = require('../middleware/validate');
const { cronAuth } = require('../middleware/cronAuth');
const { runRoiSchema } = require('../validations/cron.validation');
const controller = require('../controllers/cron.controller');

// Protected by the x-cron-secret header, not by user JWT.
router.use(cronAuth);
router.post('/roi/run', validate(runRoiSchema), controller.runRoi);
router.get('/roi/runs', controller.runs);

module.exports = router;
