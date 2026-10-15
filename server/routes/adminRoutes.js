const router = require('express').Router();
const c = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));
router.get('/users', c.users);
router.get('/trips', c.trips);
router.get('/expenses', c.expenses);
router.get('/statistics', c.statistics);

module.exports = router;
