const Expense = require('../models/Expense');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getOwnedTrip } = require('../services/tripService');
const { recalcTrip, budgetState } = require('../services/budgetService');

/** Every mutation answers with the fresh budget so the UI can update instantly (no refresh). */
async function budgetPayload(tripId, previousPercent) {
  const trip = await recalcTrip(tripId);
  const state = budgetState(trip.totalBudget, trip.actualSpent);
  const crossed = [100, 90, 75, 50].find((t) => previousPercent < t && state.percentUsed >= t) || null;
  return { budget: state, trip: { _id: trip._id, totalBudget: trip.totalBudget, actualSpent: trip.actualSpent, remainingBudget: trip.remainingBudget }, crossedThreshold: crossed };
}

async function findOwnedExpense(id, user) {
  const expense = await Expense.findById(id);
  if (!expense || String(expense.userId) !== String(user._id)) throw ApiError.notFound('Expense not found');
  return expense;
}

exports.create = asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(req.body.tripId, req.user);
  const prev = budgetState(trip.totalBudget, trip.actualSpent).percentUsed;
  const { category, description, amount, date } = req.body;
  const expense = await Expense.create({ userId: req.user._id, tripId: trip._id, category, description, amount, date });
  res.status(201).json({ expense, ...(await budgetPayload(trip._id, prev)) });
});

exports.listForTrip = asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(req.params.tripId, req.user);
  const expenses = await Expense.find({ tripId: trip._id }).sort({ date: -1, createdAt: -1 });
  res.json({ expenses, budget: budgetState(trip.totalBudget, expenses.reduce((s, e) => s + e.amount, 0)) });
});

exports.listMine = asyncHandler(async (req, res) => {
  const expenses = await Expense.find({ userId: req.user._id }).sort({ date: -1 });
  res.json({ expenses });
});

exports.update = asyncHandler(async (req, res) => {
  const expense = await findOwnedExpense(req.params.id, req.user);
  const trip = await getOwnedTrip(expense.tripId, req.user);
  const prev = budgetState(trip.totalBudget, trip.actualSpent).percentUsed;
  ['category', 'description', 'amount', 'date'].forEach((k) => { if (req.body[k] !== undefined) expense[k] = req.body[k]; });
  await expense.save();
  res.json({ expense, ...(await budgetPayload(trip._id, prev)) });
});

exports.remove = asyncHandler(async (req, res) => {
  const expense = await findOwnedExpense(req.params.id, req.user);
  const trip = await getOwnedTrip(expense.tripId, req.user);
  const prev = budgetState(trip.totalBudget, trip.actualSpent).percentUsed;
  await expense.deleteOne();
  res.json({ message: 'Expense deleted', ...(await budgetPayload(trip._id, prev)) });
});
