const Trip = require('../models/Trip');
const Expense = require('../models/Expense');
const { isoDate, diffDays, addDays } = require('../utils/dates');

const CATEGORIES = Expense.CATEGORIES;

/**
 * Budget state used by every screen (progress bars, alerts, colours).
 *  <50 safe | 50-75 moderate | 75-90 caution | 90-100 critical | >100 exceeded
 */
function budgetState(total, spent) {
  const percentUsed = total > 0 ? Math.round((spent / total) * 1000) / 10 : 0;
  let level = 'safe';
  if (percentUsed > 100) level = 'exceeded';
  else if (percentUsed >= 90) level = 'critical';
  else if (percentUsed >= 75) level = 'caution';
  else if (percentUsed >= 50) level = 'moderate';
  const messages = {
    safe: 'You are well within budget.',
    moderate: 'Half of your budget has been used.',
    caution: 'Your trip budget is almost exhausted.',
    critical: 'Only a small buffer remains.',
    exceeded: 'Your planned budget has been exceeded.',
  };
  return { total, spent, remaining: total - spent, percentUsed, level, message: messages[level] };
}

/** Re-computes spent / remaining on the trip after any expense or budget change. */
async function recalcTrip(tripId) {
  const trip = await Trip.findById(tripId);
  if (!trip) return null;
  const expenses = await Expense.find({ tripId }).select('amount').lean();
  trip.actualSpent = expenses.reduce((s, e) => s + e.amount, 0);
  trip.remainingBudget = trip.totalBudget - trip.actualSpent;
  await trip.save();
  return trip;
}

/**
 * Planned spend per category. Activities come from the itinerary; the rest of the budget is
 * split using typical Indian leisure-travel ratios, keeping a 10% safety buffer.
 */
function estimateBreakdown(totalBudget, activitiesCost) {
  const activities = Math.min(activitiesCost, totalBudget);
  const pool = Math.max(totalBudget - activities, 0) * 0.9;
  const r = (x) => Math.round(x);
  return {
    Accommodation: r(pool * 0.45), Food: r(pool * 0.28), Transportation: r(pool * 0.17),
    Activities: r(activities), Shopping: r(pool * 0.06), Other: r(pool * 0.04),
  };
}

function buildAnalytics(trip, expenses, activitiesCost) {
  const estimated = estimateBreakdown(trip.totalBudget, activitiesCost);
  const actualBy = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  expenses.forEach((e) => { actualBy[e.category] = (actualBy[e.category] || 0) + e.amount; });

  const byCategory = CATEGORIES.map((c) => ({ category: c, estimated: estimated[c], actual: actualBy[c] }));
  const estimatedTotal = byCategory.reduce((s, c) => s + c.estimated, 0);

  const perDate = {};
  expenses.forEach((e) => { const d = isoDate(e.date); perDate[d] = (perDate[d] || 0) + e.amount; });
  let running = 0;
  const timeline = Object.keys(perDate).sort().map((date) => {
    running += perDate[date];
    return { date, amount: perDate[date], cumulative: running };
  });

  const spent = running;
  const state = budgetState(trip.totalBudget, spent);
  const today = new Date();
  const daysLeft = Math.max(diffDays(today, trip.endDate) + 1, 0);
  const tripOngoing = today >= addDays(trip.startDate, 0) && daysLeft > 0;
  const dailyBudget = Math.round(trip.totalBudget / trip.numberOfDays);
  return {
    state, byCategory, timeline, estimatedTotal, dailyBudget,
    perTraveler: Math.round(spent / (trip.numberOfTravelers || 1)),
    dailyAllowanceLeft: tripOngoing && daysLeft ? Math.round(state.remaining / daysLeft) : null,
    daysLeft: tripOngoing ? daysLeft : null,
  };
}

module.exports = { budgetState, recalcTrip, estimateBreakdown, buildAnalytics };
