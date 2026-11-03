const router = require('express').Router();
const { protect } = require('../middleware/auth');
const controller = require('../controllers/dashboard.controller');

router.get('/', protect, controller.summary);

module.exports = router;
