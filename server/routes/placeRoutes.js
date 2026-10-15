const router = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/placeController');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const Place = require('../models/Place');

const rules = (optional) => {
  const o = (chain) => (optional ? chain.optional() : chain);
  return [
    o(body('name').trim().isLength({ min: 2, max: 120 })).withMessage('Place name is required'),
    o(body('destination').trim().notEmpty()).withMessage('Destination is required'),
    o(body('category').isIn(Place.CATEGORIES)).withMessage('Choose a valid category'),
    o(body('latitude').isFloat({ min: -90, max: 90 })).withMessage('Latitude must be between -90 and 90'),
    o(body('longitude').isFloat({ min: -180, max: 180 })).withMessage('Longitude must be between -180 and 180'),
    body('estimatedCost').optional().isFloat({ min: 0 }).withMessage('Cost cannot be negative'),
    body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('Rating must be 0-5'),
    body('popularity').optional().isFloat({ min: 0, max: 100 }).withMessage('Popularity must be 0-100'),
    body('crowdLevel').optional().isIn(['Low', 'Medium', 'High']).withMessage('Crowd level must be Low, Medium or High'),
    body('bestTimeToVisit').optional().isIn(['Morning', 'Afternoon', 'Evening', 'Anytime']).withMessage('Invalid best time'),
    body('openingTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('Opening time must be HH:MM'),
    body('closingTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('Closing time must be HH:MM'),
  ];
};

router.use(protect);
router.get('/', c.list);
router.get('/destinations', c.destinations);
router.get('/:id', c.get);
router.post('/', authorize('admin'), rules(false), validate, c.create);
router.put('/:id', authorize('admin'), rules(true), validate, c.update);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;
