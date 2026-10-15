const router = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter your full name (at least 2 characters)'),
  body('email').trim().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((v, { req }) => v === req.body.password).withMessage('Passwords do not match'),
], validate, c.register);

router.post('/login', [
  body('email').trim().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
], validate, c.login);

router.post('/logout', c.logout);
router.get('/me', protect, c.me);
router.put('/me', protect, [
  body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
  body('profileImage').optional().isString().isLength({ max: 500 }).withMessage('Image URL is too long'),
], validate, c.updateProfile);
router.put('/password', protect, [
  body('currentPassword').notEmpty().withMessage('Enter your current password'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], validate, c.changePassword);

module.exports = router;
