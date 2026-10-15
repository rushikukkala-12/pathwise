const Itinerary = require('../models/Itinerary');
const Place = require('../models/Place');
const ApiError = require('../utils/ApiError');
const { addDays, isoDate } = require('../utils/dates');
const { haversine, round } = require('../utils/geo');
const { geocode } = require('./mapService');
const { getForecastMap } = require('./weatherService');
const { getPlacesForDestination } = require('./placeService');
const { estimateBreakdown } = require('./budgetService');
const { scorePlace, rankPlaces, findReplacements, slotBudget, ACTIVITY_SHARE, idOf } = require('./recommendationService');

const SLOT_NAMES = ['Morning', 'Afternoon', 'Evening'];
const ROAD_FACTOR = 1.3;
const CITY_SPEED_KMPH = 25;
const HIGHWAY_SPEED_KMPH = 45;

/** Cost, distance and travel-time for a day (hotel -> stop1 -> stop2 -> stop3 -> hotel). */
function dayStats(items, center, travelers) {
  const pts = items.map((i) => ({ lat: i.place.latitude, lng: i.place.longitude }));
  let km = 0;
  let hours = 0;
  let prev = center;
  const legs = [];
  const leg = (a, b) => { const d = haversine(a, b) * ROAD_FACTOR; km += d; hours += d / (d > 20 ? HIGHWAY_SPEED_KMPH : CITY_SPEED_KMPH); return d; };
  pts.forEach((p) => { legs.push(round(leg(prev, p))); prev = p; });
  if (pts.length) leg(prev, center);
  return {
    legs,
    estimatedCost: items.reduce((s, i) => s + (i.place.estimatedCost || 0) * travelers, 0),
    travelDistance: round(km),
    travelTime: pts.length ? Math.round(hours * 60 + pts.length * 10) : 0,
  };
}

function dayActivities(trip, dayNo) {
  if (trip.numberOfDays === 1) return [`Start early from ${trip.startingLocation}; plan to be back by night`, 'Lunch at a well-reviewed local restaurant'];
  if (dayNo === 1) return [`Travel from ${trip.startingLocation} to ${trip.destination} and check in to your stay`, 'Dinner at a local favourite'];
  if (dayNo === trip.numberOfDays) return ['Breakfast, then check out', `Head back to ${trip.startingLocation}`];
  return ['Lunch at a well-reviewed local restaurant', 'Dinner and an easy evening walk'];
}

/** Builds (but does not save) a complete itinerary plan. */
async function buildPlan(trip, pool, { budgetFactor = 1 } = {}) {
  const dates = Array.from({ length: trip.numberOfDays }, (_, i) => addDays(trip.startDate, i));
  const forecast = await getForecastMap(trip.destination, dates);
  const center = await geocode(trip.destination);
  const centerPt = { lat: center.lat, lng: center.lng };
  const perSlotBudget = slotBudget(trip) * budgetFactor;
  const allowance = trip.totalBudget * ACTIVITY_SHARE * budgetFactor;
  const usage = new Map();
  const days = [];

  dates.forEach((date, idx) => {
    const weather = forecast[isoDate(date)];
    const items = [];
    let from = centerPt;
    SLOT_NAMES.forEach((slot) => {
      const today = new Set(items.map((i) => idOf(i.place)));
      const ranked = pool.filter((p) => !today.has(idOf(p)))
        .map((p) => ({ place: p, ...scorePlace(p, { interests: trip.interests, perSlotBudget, weather, slot, from, center: centerPt, usedCount: usage.get(idOf(p)) || 0, dayCategories: items.map((i) => i.place.category) }) }))
        .sort((a, b) => b.score - a.score);
      const best = ranked[0];
      if (!best) return;
      items.push({ slot, place: best.place, score: best.score });
      usage.set(idOf(best.place), (usage.get(idOf(best.place)) || 0) + 1);
      from = { lat: best.place.latitude, lng: best.place.longitude };
    });
    days.push({ day: idx + 1, date, weather, items });
  });

  // Budget trimming: swap the costliest stops for cheaper, well-scored alternatives until we fit.
  const total = () => days.reduce((s, d) => s + d.items.reduce((x, i) => x + (i.place.estimatedCost || 0) * trip.numberOfTravelers, 0), 0);
  for (let guard = 0; guard < 40 && total() > allowance; guard++) {
    const all = days.flatMap((d) => d.items.map((i) => ({ d, i }))).sort((a, b) => b.i.place.estimatedCost - a.i.place.estimatedCost);
    let swapped = false;
    for (const { d, i } of all) {
      if (!i.place.estimatedCost) break;
      const onDay = new Set(d.items.map((x) => idOf(x.place)));
      const used = new Set(days.flatMap((dd) => dd.items.map((x) => idOf(x.place))));
      const cheaper = pool.filter((p) => !onDay.has(idOf(p)) && (p.estimatedCost || 0) < i.place.estimatedCost);
      if (!cheaper.length) continue;
      const ranked = rankPlaces(cheaper, { interests: trip.interests, perSlotBudget, weather: d.weather, slot: i.slot, from: centerPt })
        .map((r) => ({ ...r, adj: r.score - (used.has(idOf(r.place)) ? 20 : 0) })).sort((a, b) => b.adj - a.adj);
      i.place = ranked[0].place; i.score = ranked[0].score; swapped = true;
      break;
    }
    if (!swapped) break;
  }

  days.forEach((d) => {
    const st = dayStats(d.items, centerPt, trip.numberOfTravelers);
    d.items.forEach((it, k) => { it.distanceFromPrevious = st.legs[k]; });
    Object.assign(d, st);
    const w = d.weather;
    d.notes = w ? `${w.description}, ${w.tempMax}°C / ${w.tempMin}°C.${w.rainChance >= 60 ? ' Rain is likely, so indoor-friendly stops were prioritised.' : ''}` : '';
  });
  return days;
}

/** Replaces the stored itinerary of a trip with a freshly generated one. */
async function generateItinerary(trip, options = {}) {
  const pool = await getPlacesForDestination(trip.destination);
  const plan = await buildPlan(trip, pool, options);
  await Itinerary.deleteMany({ tripId: trip._id });
  const docs = await Itinerary.insertMany(plan.map((d) => ({
    tripId: trip._id, day: d.day, date: d.date, activities: dayActivities(trip, d.day),
    places: d.items.map((i) => ({ slot: i.slot, place: i.place._id, estimatedCost: (i.place.estimatedCost || 0) * trip.numberOfTravelers, distanceFromPrevious: i.distanceFromPrevious, score: i.score })),
    estimatedCost: d.estimatedCost, travelDistance: d.travelDistance, travelTime: d.travelTime, notes: d.notes,
  })));
  trip.itinerary = docs.map((d) => d._id);
  await syncTripEstimate(trip, docs.reduce((s, d) => s + d.estimatedCost, 0));
  return loadItinerary(trip._id);
}

async function syncTripEstimate(trip, activitiesCost) {
  const b = estimateBreakdown(trip.totalBudget, activitiesCost);
  trip.estimatedCost = Object.values(b).reduce((s, v) => s + v, 0);
  trip.remainingBudget = trip.totalBudget - (trip.actualSpent || 0);
  await trip.save();
}

async function loadItinerary(tripId) {
  const days = await Itinerary.find({ tripId }).sort({ day: 1 }).populate('places.place').lean();
  return days.map((d) => ({ ...d, places: d.places.filter((i) => i.place) }));
}

async function recomputeDay(dayDoc, trip) {
  const ids = dayDoc.places.map((i) => i.place);
  const places = await Place.find({ _id: { $in: ids } }).lean();
  const byId = new Map(places.map((p) => [idOf(p), p]));
  const center = await geocode(trip.destination);
  const order = { Morning: 0, Afternoon: 1, Evening: 2 };
  dayDoc.places.sort((a, b) => order[a.slot] - order[b.slot]);
  const items = dayDoc.places.map((i) => ({ slot: i.slot, place: byId.get(String(i.place)) })).filter((i) => i.place);
  const st = dayStats(items, { lat: center.lat, lng: center.lng }, trip.numberOfTravelers);
  dayDoc.places.forEach((it, k) => { it.distanceFromPrevious = st.legs[k] || 0; const p = byId.get(String(it.place)); if (p) it.estimatedCost = (p.estimatedCost || 0) * trip.numberOfTravelers; });
  dayDoc.estimatedCost = st.estimatedCost;
  dayDoc.travelDistance = st.travelDistance;
  dayDoc.travelTime = st.travelTime;
}

/**
 * Manual edits: remove / replace / add a stop.
 * On removal we return replacement suggestions that match the same interest and budget (Condition 4).
 */
async function modifyItinerary(trip, body) {
  const { action, day, itemId, placeId, slot } = body;
  const dayDoc = await Itinerary.findOne({ tripId: trip._id, day: Number(day) });
  if (!dayDoc) throw ApiError.notFound(`Day ${day} does not exist in this itinerary`);
  const pool = await getPlacesForDestination(trip.destination);
  let replacements = [];
  let message = '';

  if (action === 'remove') {
    const item = dayDoc.places.id(itemId);
    if (!item) throw ApiError.notFound('That stop is not in the itinerary');
    const removed = pool.find((p) => idOf(p) === String(item.place)) || (await Place.findById(item.place).lean());
    dayDoc.places.pull(itemId);
    const planned = (await Itinerary.find({ tripId: trip._id }).lean()).flatMap((d) => d.places.map((p) => String(p.place)));
    const sameDay = dayDoc.places.map((p) => String(p.place));   // removed stop already pulled
    const wmap = await getForecastMap(trip.destination, [dayDoc.date]);
    if (removed) {
      replacements = findReplacements({ place: removed, trip, pool, excludeIds: [...sameDay, String(removed._id)], softExcludeIds: planned, slot: item.slot, weather: wmap[isoDate(dayDoc.date)], maxCost: Math.max((removed.estimatedCost || 0) * 1.25, slotBudget(trip) * 1.2), limit: 3 })
        .map((r) => ({ place: r.place, score: r.score, slot: item.slot, sameCategory: r.sameCategory, reason: `${r.sameCategory ? 'Same category' : 'Matches your interests'} and ${r.place.estimatedCost <= (removed.estimatedCost || 0) ? 'within' : 'close to'} your budget.` }));
      message = `${removed.name} removed from Day ${day}.${replacements.length ? ` Try ${replacements[0].place.name} instead.` : ''}`;
    }
  } else if (action === 'replace' || action === 'add') {
    const place = await Place.findById(placeId).lean();
    if (!place) throw ApiError.notFound('Place not found');
    if (place.destination.toLowerCase() !== trip.destination.toLowerCase()) throw ApiError.badRequest(`${place.name} is in ${place.destination}, not ${trip.destination}`);
    let target = action === 'replace' ? dayDoc.places.id(itemId) : dayDoc.places.find((i) => i.slot === slot);
    if (action === 'replace' && !target) throw ApiError.notFound('That stop is not in the itinerary');
    if (action === 'add' && !SLOT_NAMES.includes(slot)) throw ApiError.badRequest('Choose Morning, Afternoon or Evening');
    if (dayDoc.places.some((i) => String(i.place) === String(place._id) && i !== target)) throw ApiError.badRequest(`${place.name} is already planned for Day ${day}`);
    if (target) { target.place = place._id; }
    else dayDoc.places.push({ slot, place: place._id });
    message = `${place.name} ${action === 'add' ? 'added to' : 'now planned on'} Day ${day}.`;
  } else {
    throw ApiError.badRequest('Unknown action. Use remove, replace or add.');
  }

  await recomputeDay(dayDoc, trip);
  await dayDoc.save();
  const all = await Itinerary.find({ tripId: trip._id }).select('estimatedCost').lean();
  await syncTripEstimate(trip, all.reduce((s, d) => s + d.estimatedCost, 0));
  return { itinerary: await loadItinerary(trip._id), replacements, message };
}

module.exports = { generateItinerary, loadItinerary, modifyItinerary, buildPlan, syncTripEstimate };
