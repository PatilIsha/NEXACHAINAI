const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/investments', require('./investment.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/roi', require('./roi.routes'));
router.use('/referrals', require('./referral.routes'));
router.use('/cron', require('./cron.routes'));

module.exports = router;
