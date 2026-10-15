const Trip = require('../models/Trip');
const Expense = require('../models/Expense');
const Itinerary = require('../models/Itinerary');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { inclusiveDays, startOfDay, addDays } = require('../utils/dates');
const { generateItinerary, loadItinerary, modifyItinerary, syncTripEstimate } = require('../services/itineraryService');
const { computeStatus, present, presentFull, getOwnedTrip } = require('../services/tripService');
const { budgetState, buildAnalytics } = require('../services/budgetService');
const { buildDynamicRecommendations, rankPlaces, slotBudget, idOf } = require('../services/recommendationService');
const { getPlacesForDestination } = require('../services/placeService');
const { getForecastMap } = require('../services/weatherService');
const { getRoute, geocode } = require('../services/mapService');

const MAX_DAYS = 30;

function applyDates(trip, startDate, endDate) {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  if (end < start) throw ApiError.badRequest('End date cannot be before the start date');
  const days = inclusiveDays(start, end);
  if (days > MAX_DAYS) throw ApiError.badRequest(`Trips can be at most ${MAX_DAYS} days long`);
  trip.startDate = start; trip.endDate = end; trip.numberOfDays = days;
}

exports.createTrip = asyncHandler(async (req, res) => {
  const b = req.body;
  const trip = new Trip({
    userId: req.user._id, title: b.title, startingLocation: b.startingLocation, destination: b.destination,
    numberOfTravelers: b.numberOfTravelers, totalBudget: b.totalBudget, interests: b.interests || [],
  });
  applyDates(trip, b.startDate, b.endDate);
  trip.remainingBudget = trip.totalBudget;
  await trip.save();
  await generateItinerary(trip);
  res.status(201).json({ trip: await presentFull(trip) });
});

exports.listTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.find({ userId: req.user._id }).sort({ createdAt: -1 });
  let out = trips.map((t) => present(t));
  if (req.query.status) out = out.filter((t) => t.status === req.query.status);
  res.json({ trips: out });
});

exports.getTrip = asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(req.params.id, req.user);
  res.json({ trip: await presentFull(trip) });
});

exports.updateTrip = asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(req.params.id, req.user);
  const b = req.body;
  const before = { destination: trip.destination.toLowerCase(), days: trip.numberOfDays, start: +trip.startDate, travelers: trip.numberOfTravelers, budget: trip.totalBudget, interests: [...trip.interests].sort().join() };

  ['title', 'startingLocation', 'destination', 'numberOfTravelers', 'totalBudget'].forEach((k) => { if (b[k] !== undefined) trip[k] = b[k]; });
  if (b.interests !== undefined) trip.interests = b.interests;
  if (b.status !== undefined) trip.status = b.status === 'Cancelled' ? 'Cancelled' : 'Planned';   // other states are derived from dates
  if (b.startDate || b.endDate) applyDates(trip, b.startDate || trip.startDate, b.endDate || trip.endDate);
  trip.remainingBudget = trip.totalBudget - trip.actualSpent;

  const budgetDecreased = trip.totalBudget < before.budget;
  const reasons = [];
  if (trip.destination.toLowerCase() !== before.destination) reasons.push('destination changed');
  if (trip.numberOfDays !== before.days || +trip.startDate !== before.start) reasons.push('dates changed');
  if (trip.numberOfTravelers !== before.travelers) reasons.push('traveler count changed');
  if ([...trip.interests].sort().join() !== before.interests) reasons.push('interests changed');
  if (budgetDecreased) reasons.push('budget decreased');
  const regenerate = b.regenerate !== false && reasons.length > 0;

  await trip.save();
  if (regenerate) await generateItinerary(trip, budgetDecreased ? { budgetFactor: 1 } : {});
  else {
    const days = await Itinerary.find({ tripId: trip._id }).select('estimatedCost').lean();
    await syncTripEstimate(trip, days.reduce((s, d) => s + d.estimatedCost, 0));
  }
  res.json({
    trip: await presentFull(trip),
    meta: { regenerated: regenerate, budgetDecreased, reason: regenerate ? `Itinerary re-planned because ${reasons.join(', ')}.` : '' },
  });
});

exports.deleteTrip = asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(req.params.id, req.user);
  await Promise.all([Expense.deleteMany({ tripId: trip._id }), Itinerary.deleteMany({ tripId: trip._id })]);
  await trip.deleteOne();
  res.json({ message: 'Trip deleted' });
});

exports.generate = asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(req.params.id, req.user);
  const optimise = req.body && req.body.optimise === true;
  const itinerary = await generateItinerary(trip, optimise ? { budgetFactor: 0.6 } : {});
  res.json({ trip: present(trip, itinerary), message: optimise ? 'Itinerary optimised for a lower budget.' : 'Itinerary generated.' });
});

exports.modify = asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(req.params.id, req.user);
  const result = await modifyItinerary(trip, req.body);
  res.json({ trip: present(trip, result.itinerary), replacements: result.replacements, message: result.message });
});

exports.recommendations = asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(req.params.id, req.user);
  const [days, pool] = await Promise.all([loadItinerary(trip._id), getPlacesForDestination(trip.destination)]);
  const forecast = await getForecastMap(trip.destination, days.map((d) => d.date));
  res.json(buildDynamicRecommendations({ trip, days, pool, forecast }));
});

exports.analytics = asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(req.params.id, req.user);
  const [expenses, days] = await Promise.all([Expense.find({ tripId: trip._id }).lean(), Itinerary.find({ tripId: trip._id }).select('estimatedCost').lean()]);
  res.json(buildAnalytics(trip, expenses, days.reduce((s, d) => s + d.estimatedCost, 0)));
});

exports.mapData = asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(req.params.id, req.user);
  const [route, days] = await Promise.all([getRoute(trip.startingLocation, trip.destination), loadItinerary(trip._id)]);
  const seen = new Set();
  const stops = [];
  days.forEach((d) => d.places.forEach((i) => {
    const id = String(i.place._id);
    if (seen.has(id)) return;
    seen.add(id);
    stops.push({ ...i.place, day: d.day, slot: i.slot });
  }));
  res.json({ route, stops });
});

exports.overview = asyncHandler(async (req, res) => {
  const trips = (await Trip.find({ userId: req.user._id }).sort({ createdAt: -1 })).map((t) => present(t));
  const live = trips.filter((t) => t.status !== 'Cancelled');
  const totalBudget = live.reduce((s, t) => s + t.totalBudget, 0);
  const totalSpent = live.reduce((s, t) => s + t.actualSpent, 0);
  const focus = trips.find((t) => t.status === 'Active') || trips.find((t) => t.status === 'Planned');
  res.json({
    totalTrips: trips.length,
    activeTrips: trips.filter((t) => t.status === 'Active').length,
    upcomingTrips: trips.filter((t) => t.status === 'Planned').length,
    totalBudget, totalSpent, remaining: totalBudget - totalSpent,
    budget: budgetState(totalBudget, totalSpent),
    focusTrip: focus || null,
    recentTrips: trips.slice(0, 5),
  });
});

/** Places ranked by the recommendation score (interests, rating, budget, crowd, distance ...). */
exports.recommendedPlaces = asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(req.params.id, req.user);
  const [days, pool, center] = await Promise.all([loadItinerary(trip._id), getPlacesForDestination(trip.destination), geocode(trip.destination)]);
  const planned = new Set(days.flatMap((d) => d.places.map((p) => idOf(p.place))));
  const ranked = rankPlaces(pool, { interests: trip.interests, perSlotBudget: slotBudget(trip), weather: null, from: { lat: center.lat, lng: center.lng } });
  res.json({ places: ranked.slice(0, 12).map((r) => ({ ...r.place, score: r.score, breakdown: r.breakdown, planned: planned.has(idOf(r.place)) })) });
});
