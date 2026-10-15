const router = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/tripController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const Trip = require('../models/Trip');

const tripRules = (optional) => {
  const o = (chain) => (optional ? chain.optional() : chain);
  return [
    o(body('title').trim().isLength({ min: 2, max: 100 })).withMessage('Trip name must be 2-100 characters'),
    o(body('startingLocation').trim().notEmpty()).withMessage('Starting location is required'),
    o(body('destination').trim().notEmpty()).withMessage('Destination is required'),
    o(body('startDate').isISO8601()).withMessage('Enter a valid start date'),
    o(body('endDate').isISO8601()).withMessage('Enter a valid end date'),
    o(body('numberOfTravelers').isInt({ min: 1, max: 50 })).withMessage('Travelers must be between 1 and 50'),
    o(body('totalBudget').isFloat({ min: 500, max: 100000000 })).withMessage('Budget must be at least ₹500'),
    body('interests').optional().isArray({ max: 10 }).withMessage('Interests must be a list'),
    body('interests.*').optional().isIn(Trip.INTERESTS).withMessage('Unknown interest selected'),
  ];
};

router.use(protect);
router.get('/stats/overview', c.overview);
router.route('/').get(c.listTrips).post(tripRules(false), validate, c.createTrip);
router.route('/:id')
  .get(c.getTrip)
  .put(tripRules(true), body('status').optional().isIn(['Planned', 'Cancelled']).withMessage('Invalid status'), validate, c.updateTrip)
  .delete(c.deleteTrip);

router.post('/:id/itinerary/generate', c.generate);
router.put('/:id/itinerary', [
  body('action').isIn(['remove', 'replace', 'add']).withMessage('Action must be remove, replace or add'),
  body('day').isInt({ min: 1 }).withMessage('Day is required'),
], validate, c.modify);
router.get('/:id/recommendations', c.recommendations);
router.get('/:id/analytics', c.analytics);
router.get('/:id/map', c.mapData);
router.get('/:id/recommended-places', c.recommendedPlaces);

module.exports = router;
