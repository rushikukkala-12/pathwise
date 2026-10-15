const router = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/expenseController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const Expense = require('../models/Expense');

const rules = (optional) => {
  const o = (chain) => (optional ? chain.optional() : chain);
  return [
    o(body('category').isIn(Expense.CATEGORIES)).withMessage('Choose a valid category'),
    o(body('description').trim().isLength({ min: 2, max: 200 })).withMessage('Add a short description (2-200 characters)'),
    o(body('amount').isFloat({ min: 1, max: 100000000 })).withMessage('Amount must be greater than zero'),
    o(body('date').isISO8601()).withMessage('Enter a valid date'),
  ];
};

router.use(protect);
router.get('/', c.listMine);
router.post('/', [body('tripId').isMongoId().withMessage('Choose a trip'), ...rules(false)], validate, c.create);
router.get('/:tripId', c.listForTrip);
router.put('/:id', rules(true), validate, c.update);
router.delete('/:id', c.remove);

module.exports = router;
