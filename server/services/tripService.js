const Trip = require('../models/Trip');
const ApiError = require('../utils/ApiError');
const { startOfDay } = require('../utils/dates');
const { budgetState } = require('./budgetService');
const { loadItinerary } = require('./itineraryService');

/** Status is derived from dates unless the user cancelled the trip. */
function computeStatus(trip) {
  if (trip.status === 'Cancelled') return 'Cancelled';
  const today = startOfDay(new Date());
  if (today < startOfDay(trip.startDate)) return 'Planned';
  if (today > startOfDay(trip.endDate)) return 'Completed';
  return 'Active';
}

function present(tripDoc, itinerary) {
  const t = tripDoc.toObject ? tripDoc.toObject() : tripDoc;
  const out = { ...t, status: computeStatus(t), budget: budgetState(t.totalBudget, t.actualSpent || 0) };
  if (itinerary) out.itinerary = itinerary;
  else delete out.itinerary;
  return out;
}

async function getOwnedTrip(id, user) {
  const trip = await Trip.findById(id);
  if (!trip || String(trip.userId) !== String(user._id)) throw ApiError.notFound('Trip not found');
  return trip;
}

async function presentFull(trip) {
  return present(trip, await loadItinerary(trip._id));
}

module.exports = { computeStatus, present, presentFull, getOwnedTrip };
