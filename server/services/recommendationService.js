/**
 * Dynamic recommendation engine.
 *
 * Recommendation score (0-100) =
 *   Interest match (30) + Rating (15) + Budget compatibility (20) + Weather suitability (10)
 *   + Crowd suitability (10) + Distance (10) + Popularity (5)   [+5 slot-fit bonus, capped at 100]
 *
 * Days and group size feed the budget term: the sightseeing allowance (30% of the trip budget) is divided
 * across travelers and across the number of planned time-slots (days x 3).
 */
const { haversine, round } = require('../utils/geo');
const { isOutdoorUnsuitable } = require('./weatherService');
const { budgetState } = require('./budgetService');

const ACTIVITY_SHARE = 0.3;
const SLOTS = {
  Morning: { start: 540, mid: 630 },    // 09:00 - 12:00
  Afternoon: { start: 780, mid: 900 },  // 13:00 - 17:00
  Evening: { start: 1050, mid: 1140 },  // 17:30 - 21:00
};

const INTEREST_MAP = {
  Nature: { categories: ['Nature'], tags: ['nature', 'garden', 'lake', 'waterfall', 'hills'] },
  Adventure: { categories: ['Adventure'], tags: ['adventure', 'trek', 'caves'] },
  Historical: { categories: ['Historical'], tags: ['heritage', 'fort', 'palace', 'temple'] },
  Beaches: { categories: ['Beach'], tags: ['beach', 'sunset'] },
  Food: { categories: ['Food'], tags: ['food', 'local', 'cuisine'] },
  Shopping: { categories: ['Shopping'], tags: ['shopping', 'market'] },
  Culture: { categories: ['Culture'], tags: ['culture', 'museum', 'art', 'temple'] },
  Photography: { categories: [], tags: ['photography', 'sunset', 'viewpoint'] },
  Entertainment: { categories: ['Entertainment'], tags: ['entertainment', 'nightlife', 'theme-park'] },
  Relaxation: { categories: [], tags: ['relaxation', 'beach', 'garden', 'lake'] },
};

const toMin = (t) => { const [h, m] = String(t || '00:00').split(':').map(Number); return h * 60 + (m || 0); };
const idOf = (p) => String(p._id || p);

function interestMatch(place, interests) {
  if (!interests || !interests.length) return 0.5;
  let best = 0;
  interests.forEach((i) => {
    const m = INTEREST_MAP[i];
    if (!m) return;
    if (m.categories.includes(place.category)) best = Math.max(best, 1);
    else if ((place.tags || []).some((t) => m.tags.includes(t))) best = Math.max(best, 0.6);
  });
  return best;
}

function isOpen(place, slot) {
  const s = SLOTS[slot];
  if (!s) return true;
  return toMin(place.openingTime) <= s.mid && toMin(place.closingTime) >= s.mid + 45;
}

/** Per-person spend we can afford for one time-slot. */
function slotBudget(trip) {
  const slots = Math.max(trip.numberOfDays * 3, 1);
  return (trip.totalBudget * ACTIVITY_SHARE) / Math.max(trip.numberOfTravelers, 1) / slots;
}

/**
 * ctx: { interests, perSlotBudget, weather (forecast day | null), slot, from ({lat,lng}|null), usedCount }
 */
function scorePlace(place, ctx) {
  const interest = 30 * interestMatch(place, ctx.interests);
  const rating = (Math.min(place.rating || 0, 5) / 5) * 15;

  const cost = place.estimatedCost || 0;
  let budget;
  if (cost <= 0) budget = 20;
  else {
    const ratio = cost / Math.max(ctx.perSlotBudget, 1);
    budget = ratio <= 1 ? 20 - 8 * ratio : ratio <= 2 ? 12 - 12 * (ratio - 1) : 0;
  }

  let weather = 8;
  if (ctx.weather) {
    const bad = isOutdoorUnsuitable(ctx.weather);
    if (bad) weather = place.isIndoor ? 10 : -30;   // strongly avoid outdoor plans in rain / storms / extreme heat
    else weather = place.isIndoor ? 7 : 10;
    if (!bad && !place.isIndoor && ctx.weather.tempMax >= 38 && ctx.slot === 'Afternoon') weather = 3;
  }

  const crowd = { Low: 10, Medium: 6, High: 2 }[place.crowdLevel] ?? 6;

  let distance = 8;
  if (ctx.from) {
    const km = haversine(ctx.from, { lat: place.latitude, lng: place.longitude });
    // 0-3 km: full marks, fades to 0 at 30 km, then a growing penalty so a day never zig-zags across a region
    distance = km <= 3 ? 10 : km <= 10 ? 10 - ((km - 3) / 7) * 4 : km <= 30 ? 6 - (km - 10) * 0.3 : -Math.min((km - 30) * 0.6, 40);
  }
  // Stay reasonably close to the base city: far-flung places lose points even if the previous stop was also far
  if (ctx.center) {
    const kc = haversine(ctx.center, { lat: place.latitude, lng: place.longitude });
    if (kc > 35) distance -= Math.min((kc - 35) * 0.5, 20);
  }
  const popularity = ((place.popularity || 0) / 100) * 5;
  const slotBonus = ctx.slot && (place.bestTimeToVisit === ctx.slot || place.bestTimeToVisit === 'Anytime') ? (place.bestTimeToVisit === ctx.slot ? 5 : 1) : 0;

  let total = interest + rating + budget + weather + crowd + distance + popularity + slotBonus;
  if (ctx.slot && !isOpen(place, ctx.slot)) total *= 0.3;
  total -= (ctx.usedCount || 0) * 18;
  // Variety: avoid planning the same kind of place back-to-back within one day
  total -= (ctx.dayCategories || []).filter((c) => c === place.category).length * 12;
  const r = (x) => round(x, 1);
  return {
    score: Math.max(0, Math.min(100, r(total))),
    breakdown: { interest: r(interest), rating: r(rating), budget: r(budget), weather: r(weather), crowd, distance: r(distance), popularity: r(popularity) },
  };
}

function rankPlaces(places, ctx) {
  return places.map((p) => ({ place: p, ...scorePlace(p, ctx) })).sort((a, b) => b.score - a.score);
}

/**
 * Replacement suggestions for a place (same interest/category, within budget, weather-aware).
 */
function findReplacements({ place, trip, pool, excludeIds = [], softExcludeIds = [], slot, weather, limit = 3, mustBeIndoor = false, maxCost }) {
  // excludeIds are hard-blocked (e.g. already planned the same day); softExcludeIds are only de-prioritised
  const ex = new Set(excludeIds.map(String));
  const soft = new Set(softExcludeIds.map(String));
  ex.add(idOf(place));
  const ctx = { interests: trip.interests, perSlotBudget: slotBudget(trip), weather, slot, from: { lat: place.latitude, lng: place.longitude } };
  let candidates = pool.filter((p) => !ex.has(idOf(p)));
  if (mustBeIndoor) candidates = candidates.filter((p) => p.isIndoor);
  if (maxCost != null) candidates = candidates.filter((p) => (p.estimatedCost || 0) <= maxCost);

  const ranked = rankPlaces(candidates, ctx).map((r) => {
    const sameCategory = r.place.category === place.category;
    return { ...r, sameCategory, rankScore: r.score + (sameCategory ? 12 : 0) - (soft.has(idOf(r.place)) ? 15 : 0) };
  }).sort((a, b) => b.rankScore - a.rankScore);
  return ranked.slice(0, limit);
}

const CHEAP_TIPS = {
  Food: ['Eat at local mess / tiffin centres and street-food stalls instead of hotel restaurants.', 'Pick thalis and combo meals – they are filling and usually 40-60% cheaper.'],
  Transportation: ['Use metro, state buses or shared autos instead of cabs.', 'Book trains / buses in advance for inter-city hops; avoid last-minute fares.'],
  Stay: ['Switch to a dorm, homestay or budget lodge for the remaining nights.', 'Share rooms among travelers to split the cost.'],
};

/**
 * Builds the dynamic panel for a trip: budget alerts, weather alerts and swap suggestions.
 * `days` are populated itinerary days (places.place is a Place object).
 */
function buildDynamicRecommendations({ trip, days, pool, forecast }) {
  const state = budgetState(trip.totalBudget, trip.actualSpent || 0);
  const alerts = [];
  const suggestions = [];
  const tips = [];
  const planned = new Set();
  days.forEach((d) => d.places.forEach((i) => i.place && planned.add(idOf(i.place))));
  const perSlot = slotBudget(trip);

  // ---- Conditions 1 & 2: budget -----------------------------------------------------------
  if (state.level === 'exceeded' || state.percentUsed > 80) {
    const exceeded = state.level === 'exceeded';
    alerts.push({
      id: 'budget', type: 'budget', severity: exceeded ? 'danger' : 'warning',
      title: exceeded ? 'Your planned budget has been exceeded.' : 'Your trip budget is almost exhausted.',
      message: exceeded
        ? `You have spent ₹${Math.round(state.spent).toLocaleString('en-IN')} against a budget of ₹${Math.round(state.total).toLocaleString('en-IN')} (over by ₹${Math.round(-state.remaining).toLocaleString('en-IN')}). Switch to the low-cost options below.`
        : `${state.percentUsed}% used – only ₹${Math.round(state.remaining).toLocaleString('en-IN')} left. Consider free and low-cost options for the remaining days.`,
    });
    const remainingItems = [];
    const today = new Date();
    days.forEach((d) => d.places.forEach((i) => { if (i.place && new Date(d.date) >= new Date(today.toDateString())) remainingItems.push({ day: d, item: i }); }));
    // If the trip has not started / all days are past, look at the whole plan.
    const scope = remainingItems.length ? remainingItems : days.flatMap((d) => d.places.map((i) => ({ day: d, item: i })));
    const threshold = Math.max(perSlot * 0.6, 100);
    const suggested = new Set();
    scope.filter(({ item }) => item.place && item.place.estimatedCost > threshold)
      .sort((a, b) => b.item.place.estimatedCost - a.item.place.estimatedCost).slice(0, 3)
      .forEach(({ day, item }) => {
        const dayIds = day.places.map((i) => idOf(i.place));
        const dayWeather = forecast && forecast[new Date(day.date).toISOString().slice(0, 10)];
        const wetDay = isOutdoorUnsuitable(dayWeather);
        const [alt] = findReplacements({ place: item.place, trip, pool, excludeIds: [...dayIds, ...suggested], softExcludeIds: [...planned], slot: item.slot, weather: dayWeather, mustBeIndoor: wetDay, maxCost: Math.floor(item.place.estimatedCost * 0.5), limit: 1 });
        if (alt) suggested.add(idOf(alt.place));
        if (alt) suggestions.push({
          type: 'budget', day: day.day, slot: item.slot, itemId: String(item._id), current: item.place, place: alt.place, score: alt.score,
          saving: Math.round((item.place.estimatedCost - alt.place.estimatedCost) * trip.numberOfTravelers),
          reason: `Swap ${item.place.name} for ${alt.place.name} to save about ₹${Math.round((item.place.estimatedCost - alt.place.estimatedCost) * trip.numberOfTravelers).toLocaleString('en-IN')}.`,
        });
      });
    // Free attractions not yet in the plan
    rankPlaces(pool.filter((p) => !planned.has(idOf(p)) && (p.estimatedCost || 0) === 0), { interests: trip.interests, perSlotBudget: perSlot, weather: null, from: null })
      .slice(0, 3).forEach((r) => suggestions.push({ type: 'free', place: r.place, score: r.score, reason: `${r.place.name} is free to visit and matches your interests.` }));
    tips.push(...CHEAP_TIPS.Food, ...CHEAP_TIPS.Transportation);
    if (exceeded) tips.push(...CHEAP_TIPS.Stay);
  }

  // ---- Condition 3: weather ----------------------------------------------------------------
  const todayStart = new Date(new Date().toISOString().slice(0, 10));
  days.forEach((d) => {
    if (new Date(d.date) < todayStart) return;            // past days cannot be re-planned
    const w = forecast && forecast[new Date(d.date).toISOString().slice(0, 10)];
    if (!isOutdoorUnsuitable(w)) return;
    const outdoor = d.places.filter((i) => i.place && !i.place.isIndoor);
    if (!outdoor.length) return;
    const dateLabel = new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    const first = outdoor[0];
    const dayExclude = d.places.map((i) => idOf(i.place));
    const alts = findReplacements({ place: first.place, trip, pool, excludeIds: dayExclude, softExcludeIds: [...planned], slot: first.slot, weather: w, mustBeIndoor: true, limit: 1 });
    const altName = alts[0] ? alts[0].place.name : null;
    alerts.push({
      id: `weather-${d.day}`, type: 'weather', severity: 'warning', day: d.day,
      title: 'Weather conditions may affect this activity.',
      message: `Day ${d.day} (${dateLabel}): ${w.description.toLowerCase()}${w.rainChance ? `, ${w.rainChance}% chance of rain` : ''}. Outdoor activity may be affected.${altName ? ` Consider visiting ${altName} instead.` : ' Consider museums, shopping or indoor attractions.'}`,
    });
    outdoor.forEach((item) => {
      const [alt] = findReplacements({ place: item.place, trip, pool, excludeIds: dayExclude, softExcludeIds: [...planned], slot: item.slot, weather: w, mustBeIndoor: true, limit: 1 });
      if (alt) {
        dayExclude.push(idOf(alt.place));
        suggestions.push({
          type: 'weather', day: d.day, slot: item.slot, itemId: String(item._id), current: item.place, place: alt.place, score: alt.score,
          reason: `${w.description} expected on Day ${d.day}. Swap ${item.place.name} for the indoor option ${alt.place.name}.`,
        });
      }
    });
  });

  // ---- Itinerary vs. allowance (info) ------------------------------------------------------
  const plannedCost = days.reduce((s, d) => s + (d.estimatedCost || 0), 0);
  if (plannedCost > trip.totalBudget * ACTIVITY_SHARE * 1.15 && state.level !== 'exceeded') {
    alerts.push({
      id: 'plan-cost', type: 'budget', severity: 'info', title: 'Sightseeing plan is above its usual share.',
      message: `Activities cost ₹${Math.round(plannedCost).toLocaleString('en-IN')} which is more than 30% of your budget. Use "Optimise for budget" to trim it.`,
    });
  }

  if (!alerts.length) {
    alerts.push({ id: 'ok', type: 'ok', severity: 'success', title: 'Everything looks good.', message: 'Your spending and the weather outlook are within plan. We will flag anything that changes.' });
  }
  return { budget: state, alerts, suggestions, tips };
}

module.exports = { scorePlace, rankPlaces, findReplacements, buildDynamicRecommendations, slotBudget, interestMatch, isOpen, INTEREST_MAP, SLOTS, ACTIVITY_SHARE, idOf };
