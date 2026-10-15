const mongoose = require('mongoose');

const EXPENSE_CATEGORIES = ['Accommodation', 'Food', 'Transportation', 'Activities', 'Shopping', 'Other'];

const expenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
  category: { type: String, enum: { values: EXPENSE_CATEGORIES, message: 'Invalid expense category' }, required: [true, 'Category is required'] },
  description: { type: String, required: [true, 'Description is required'], trim: true, maxlength: 200 },
  amount: { type: Number, required: [true, 'Amount is required'], min: [1, 'Amount must be greater than zero'] },
  date: { type: Date, required: [true, 'Date is required'] },
  createdAt: { type: Date, default: Date.now },
});

expenseSchema.statics.CATEGORIES = EXPENSE_CATEGORIES;
module.exports = mongoose.model('Expense', expenseSchema);
