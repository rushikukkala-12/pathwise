const router = require('express').Router();
const c = require('../controllers/weatherController');
const { protect } = require('../middleware/auth');

router.get('/:destination', protect, c.get);
module.exports = router;
