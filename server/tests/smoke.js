/* End-to-end API smoke test.  Usage:  node tests/smoke.js  (API must be running; DB should be seeded) */
const BASE = process.env.API_URL || 'http://localhost:5000/api';
let pass = 0, fail = 0;
const ok = (cond, msg, extra) => { if (cond) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✗ ${msg}`, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };
const section = (t) => console.log(`\n${t}`);

function client() {
  let cookie = '';
  return async (method, path, body) => {
    const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const sc = res.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0].includes('=;') || sc.includes('Expires=Thu, 01 Jan 1970') ? '' : sc.split(';')[0];
    let data = null; try { data = await res.json(); } catch (e) { /* empty */ }
    return { status: res.status, data, setCookie: sc };
  };
}
const iso = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

(async () => {
  const anon = client(); const u = client(); const other = client(); const admin = client();

  section('Health & auth');
  ok((await anon('GET', '/health')).data.status === 'ok', 'health endpoint');
  ok((await anon('GET', '/trips')).status === 401, 'protected route rejects anonymous');
  const email = `tester${Date.now()}@example.com`;
  let r = await anon('POST', '/auth/register', { name: 'T', email: 'bad', password: '123', confirmPassword: '1' });
  ok(r.status === 422 && r.data.errors.length >= 3, 'register validation returns field errors', r.data);
  r = await anon('POST', '/auth/register', { name: 'Test User', email, password: 'secret1', confirmPassword: 'different' });
  ok(r.status === 422 && /match/i.test(r.data.message), 'password mismatch rejected', r.data);
  r = await u('POST', '/auth/register', { name: 'Test User', email, password: 'secret1', confirmPassword: 'secret1', role: 'admin' });
  ok(r.status === 201 && r.data.user.role === 'user', 'register works and ignores role escalation', r.data);
  ok(!JSON.stringify(r.data).includes('password'), 'password never returned');
  ok(/HttpOnly/i.test(r.setCookie || ''), 'JWT stored in httpOnly cookie');
  r = await anon('POST', '/auth/register', { name: 'Test User', email, password: 'secret1', confirmPassword: 'secret1' });
  ok(r.status === 409, 'duplicate email rejected', r.data);
  r = await anon('POST', '/auth/login', { email, password: 'wrongpass' });
  ok(r.status === 401, 'wrong password rejected');
  r = await u('GET', '/auth/me');
  ok(r.status === 200 && r.data.user.email === email, 'session persists via /auth/me');
  ok((await other('POST', '/auth/login', { email: 'priya@pathwise.com', password: 'User@123' })).status === 200, 'seeded user can log in');

  section('Trip creation + itinerary generation');
  r = await u('POST', '/trips', { title: 'Bad dates', startingLocation: 'Eluru', destination: 'Goa', startDate: iso(10), endDate: iso(5), numberOfTravelers: 2, totalBudget: 30000 });
  ok(r.status === 400 && /End date/.test(r.data.message), 'end before start rejected', r.data);
  r = await u('POST', '/trips', { title: 'Goa', startingLocation: 'Eluru', destination: 'Goa', startDate: iso(10), endDate: iso(14), numberOfTravelers: 2, totalBudget: 100 });
  ok(r.status === 422, 'tiny budget rejected', r.data);
  r = await u('POST', '/trips', { title: 'Goa Test', startingLocation: 'Eluru', destination: 'Goa', startDate: iso(10), endDate: iso(14), numberOfTravelers: 2, totalBudget: 30000, interests: ['Beaches', 'Food'] });
  ok(r.status === 201, 'trip created', r.data);
  let trip = r.data.trip; const tripId = trip._id;
  ok(trip.numberOfDays === 5, 'days auto-calculated (5)', trip.numberOfDays);
  ok(trip.itinerary.length === 5, 'itinerary has one document per day', trip.itinerary.length);
  ok(trip.itinerary.every((d) => d.places.length === 3 && ['Morning', 'Afternoon', 'Evening'].every((s) => d.places.some((p) => p.slot === s))), 'every day has morning/afternoon/evening stops');
  ok(trip.itinerary[0].places[0].place.name && trip.itinerary[0].places[0].place.rating, 'itinerary places are populated');
  const plannedCost = trip.itinerary.reduce((s, d) => s + d.estimatedCost, 0);
  ok(plannedCost > 0 && plannedCost <= 30000 * 0.3 * 1.05, `itinerary cost ₹${plannedCost} respects the 30% activity allowance`, plannedCost);
  ok(trip.estimatedCost > 0 && trip.remainingBudget === 30000, 'trip estimate + remaining set');
  const cats = trip.itinerary.flatMap((d) => d.places.map((p) => p.place.category));
  ok(cats.some((c) => c === 'Beach' || c === 'Food'), 'plan reflects interests (Beach/Food)', cats);

  section('Real-time budget tracking');
  const add = (category, description, amount, date = iso(0)) => u('POST', '/expenses', { tripId, category, description, amount, date });
  r = await add('Food', 'Dinner', 5000);
  ok(r.status === 201 && r.data.trip.actualSpent === 5000 && r.data.trip.remainingBudget === 25000, 'expense 1 updates spent/remaining instantly', r.data.trip);
  await add('Accommodation', 'Hotel', 8000);
  r = await add('Transportation', 'Cab', 3000);
  ok(r.data.trip.actualSpent === 16000 && r.data.trip.remainingBudget === 14000, 'spec example: ₹16,000 spent / ₹14,000 left', r.data.trip);
  ok(r.data.budget.level === 'moderate' && r.data.crossedThreshold === 50, 'crosses 50% threshold', r.data);
  r = await u('POST', '/expenses', { tripId, category: 'Gifts', description: 'x', amount: 5, date: iso(0) });
  ok(r.status === 422, 'invalid category rejected');
  r = await u('POST', '/expenses', { tripId, category: 'Food', description: 'neg', amount: -5, date: iso(0) });
  ok(r.status === 422, 'negative amount rejected');
  r = await other('POST', '/expenses', { tripId, category: 'Food', description: 'hack', amount: 10, date: iso(0) });
  ok(r.status === 404, "cannot add expenses to someone else's trip");

  r = await u('GET', `/trips/${tripId}/recommendations`);
  ok(!r.data.alerts.some((a) => a.type === 'budget' && a.severity !== 'info'), 'no budget alert at 53%', r.data.alerts.map((a) => a.title));

  r = await add('Activities', 'Water sports', 9000);   // 25,000 => 83%
  ok(r.data.budget.percentUsed > 80 && r.data.budget.level === 'caution', '83% -> caution level', r.data.budget);
  r = await u('GET', `/trips/${tripId}/recommendations`);
  const a80 = r.data.alerts.find((a) => a.id === 'budget');
  ok(a80 && a80.title === 'Your trip budget is almost exhausted.', 'CONDITION 1: >80% alert', r.data.alerts);
  ok(r.data.suggestions.length > 0 && r.data.tips.length > 0, 'low-cost swaps/free attractions + cheaper food/transport tips offered', { s: r.data.suggestions.length, t: r.data.tips.length });
  ok(r.data.suggestions.every((s) => s.type !== 'free' || s.place.estimatedCost === 0), 'free suggestions are actually free');
  ok(r.data.suggestions.filter((s) => s.type === 'budget').every((s) => s.saving > 0 && s.place.estimatedCost < s.current.estimatedCost), 'budget swaps are genuinely cheaper', r.data.suggestions.map((s) => [s.type, s.reason]));

  r = await add('Shopping', 'Souvenirs', 7000);        // 32,000 => 106%
  ok(r.data.budget.level === 'exceeded' && r.data.crossedThreshold === 100, 'CONDITION 2 state: exceeded', r.data.budget);
  r = await u('GET', `/trips/${tripId}/recommendations`);
  ok(r.data.alerts.some((a) => a.title === 'Your planned budget has been exceeded.' && a.severity === 'danger'), 'CONDITION 2: exceeded alert', r.data.alerts.map((a) => a.title));
  const expList = await u('GET', `/expenses/${tripId}`);
  ok(expList.data.expenses.length === 5, 'expense list for trip');
  const shop = expList.data.expenses.find((e) => e.category === 'Shopping');
  r = await u('PUT', `/expenses/${shop._id}`, { amount: 1000 });
  ok(r.data.trip.actualSpent === 26000 && r.data.budget.level === 'caution', 'editing an expense recalculates budget', r.data.trip);
  r = await u('DELETE', `/expenses/${shop._id}`);
  ok(r.data.trip.actualSpent === 25000 && r.data.trip.remainingBudget === 5000, 'deleting an expense recalculates budget', r.data.trip);

  section('Analytics');
  r = await u('GET', `/trips/${tripId}/analytics`);
  ok(r.data.byCategory.length === 6 && r.data.byCategory.find((c) => c.category === 'Food').actual === 5000, 'category analytics (actual vs estimated)', r.data.byCategory);
  ok(r.data.timeline.length >= 1 && r.data.timeline.at(-1).cumulative === 25000, 'timeline cumulative total');
  ok(Math.abs(r.data.state.percentUsed - 83.3) < 0.1, 'percent used computed', r.data.state);

  section('Itinerary modification (conditions 4 & 5)');
  trip = (await u('GET', `/trips/${tripId}`)).data.trip;
  const day1 = trip.itinerary[0]; const victim = day1.places[1];
  r = await u('PUT', `/trips/${tripId}/itinerary`, { action: 'remove', day: 1, itemId: victim._id });
  ok(r.status === 200 && r.data.trip.itinerary[0].places.length === 2, 'CONDITION 4: place removed', r.data.message);
  ok(r.data.replacements.length > 0 && r.data.replacements.every((x) => x.place._id !== victim.place._id), 'replacement suggestions returned', r.data.replacements.map((x) => x.place.name));
  const costAfterRemove = r.data.trip.itinerary[0].estimatedCost;
  ok(costAfterRemove <= day1.estimatedCost, 'day cost recalculated after removal', [costAfterRemove, day1.estimatedCost]);
  r = await u('PUT', `/trips/${tripId}/itinerary`, { action: 'add', day: 1, slot: victim.slot, placeId: r.data.replacements[0].place._id });
  ok(r.status === 200 && r.data.trip.itinerary[0].places.length === 3, 'suggested replacement added back', r.data);
  r = await u('PUT', `/trips/${tripId}/itinerary`, { action: 'add', day: 1, slot: 'Morning', placeId: (await u('GET', '/places?destination=Delhi&limit=1')).data.places[0]._id });
  ok(r.status === 400, 'cannot add a place from a different destination', r.data);
  r = await u('PUT', `/trips/${tripId}`, { totalBudget: 12000 });
  ok(r.data.meta.regenerated && r.data.meta.budgetDecreased, 'CONDITION 5: lowering budget regenerates itinerary', r.data.meta);
  const newPlan = r.data.trip.itinerary.reduce((s, d) => s + d.estimatedCost, 0);
  ok(newPlan <= 12000 * 0.3 * 1.05, `new plan ₹${newPlan} fits the lower budget`, newPlan);
  ok(r.data.trip.remainingBudget === 12000 - 25000 && r.data.trip.budget.level === 'exceeded', 'remaining budget recomputed against new total', r.data.trip.budget);
  r = await u('POST', `/trips/${tripId}/itinerary/generate`, { optimise: true });
  ok(r.status === 200 && r.data.trip.itinerary.length === 5, 'optimise-for-budget regeneration');

  section('Weather condition (3) & weather API');
  r = await u('GET', '/weather/Goa?days=7');
  ok(r.data.forecast.length === 7 && r.data.current.temp && r.data.source, `forecast returned (${r.data.source} mode)`);
  // Find a wet date window in mock data and verify weather alerts + indoor swaps
  let foundWeather = false;
  for (let off = 0; off < 400 && !foundWeather; off += 7) {
    const w = await u('GET', `/weather/Goa?days=7&from=${iso(off)}`);
    const wet = w.data.forecast.filter((f) => ['Rain', 'Thunderstorm', 'Drizzle'].includes(f.condition)).length;
    if (wet < 3) continue;
    const t2 = await u('POST', '/trips', { title: 'Rainy test', startingLocation: 'Hyderabad', destination: 'Goa', startDate: iso(off), endDate: iso(off + 4), numberOfTravelers: 2, totalBudget: 50000, interests: ['Beaches', 'Nature'] });
    const t2id = t2.data.trip._id;
    const wetIdx = w.data.forecast.findIndex((f) => ['Rain', 'Thunderstorm', 'Drizzle'].includes(f.condition));
    const wetDays = new Set(w.data.forecast.slice(0, 5).map((f, i) => (['Rain', 'Thunderstorm', 'Drizzle'].includes(f.condition) ? i + 1 : null)).filter(Boolean));
    const planned = t2.data.trip.itinerary.flatMap((d) => d.places.map((p) => ({ day: d.day, ...p })));
    const outdoorOnWet = planned.filter((p) => wetDays.has(p.day) && !p.place.isIndoor).length;
    const indoorOnWet = planned.filter((p) => wetDays.has(p.day) && p.place.isIndoor).length;
    ok(indoorOnWet > outdoorOnWet, `generator avoids outdoor stops on wet days (${indoorOnWet} indoor vs ${outdoorOnWet} outdoor)`, { wetDays: [...wetDays] });
    let recs = await u('GET', `/trips/${t2id}/recommendations`);
    ok(!recs.data.alerts.some((a) => a.type === 'weather') || outdoorOnWet > 0, 'fresh plan needs no weather alert unless outdoor stops remain on wet days');
    // Simulate "forecast worsened / user picked an outdoor stop": put a beach into a rainy day
    const wetDay = wetIdx + 1;
    const onDay = new Set(t2.data.trip.itinerary[wetDay - 1].places.map((p) => p.place._id));
    const outdoor = (await u('GET', '/places?destination=Goa&limit=100')).data.places.find((p) => !p.isIndoor && !onDay.has(p._id));
    const addRes = await u('PUT', `/trips/${t2id}/itinerary`, { action: 'add', day: wetDay, slot: 'Morning', placeId: outdoor._id });
    ok(addRes.status === 200, 'outdoor stop added to a rainy day', addRes.data);
    recs = await u('GET', `/trips/${t2id}/recommendations`);
    const wa = recs.data.alerts.filter((a) => a.type === 'weather' && a.day === wetDay);
    const sw = recs.data.suggestions.filter((s) => s.type === 'weather' && s.day === wetDay);
    ok(wa.length > 0 && wa[0].title === 'Weather conditions may affect this activity.', 'CONDITION 3: weather alert raised', recs.data.alerts.map((a) => a.title));
    ok(/Outdoor activity may be affected/.test(wa[0] && wa[0].message) && /instead/.test(wa[0] && wa[0].message), 'alert message names an indoor alternative', wa[0] && wa[0].message);
    ok(sw.length > 0 && sw.every((s) => s.place.isIndoor), 'indoor alternatives suggested', sw.map((s) => s.place.name));
    const s0 = sw[0];
    const sr = await u('PUT', `/trips/${t2id}/itinerary`, { action: 'replace', day: s0.day, itemId: s0.itemId, placeId: s0.place._id });
    ok(sr.status === 200 && sr.data.trip.itinerary[s0.day - 1].places.some((p) => p.place._id === s0.place._id), 'applying the weather swap updates the itinerary', sr.data.message);
    recs = await u('GET', `/trips/${t2id}/recommendations`);
    ok(!recs.data.suggestions.some((x) => x.itemId === s0.itemId), 'no more swap suggestion for the stop that was already swapped');
    await u('DELETE', `/trips/${t2id}`);
    foundWeather = true;
  }
  ok(foundWeather, 'found a rainy window to test weather logic');

  section('Dashboard overview & trips list');
  r = await u('GET', '/trips/stats/overview');
  ok(r.data.totalTrips >= 1 && r.data.recentTrips.length >= 1, 'dashboard overview', r.data.totalTrips);
  r = await anon('POST', '/auth/login', { email: 'user@pathwise.com', password: 'User@123' });
  const demo = client(); await demo('POST', '/auth/login', { email: 'user@pathwise.com', password: 'User@123' });
  r = await demo('GET', '/trips/stats/overview');
  ok(r.data.activeTrips === 1 && r.data.upcomingTrips >= 2 && r.data.totalTrips === 5, 'demo user: 1 active, 2+ upcoming, 5 total', { a: r.data.activeTrips, u: r.data.upcomingTrips, t: r.data.totalTrips });
  const active = r.data.focusTrip;
  ok(active.destination === 'Goa' && active.budget.level === 'caution', 'seeded active Goa trip sits in the caution zone', active.budget);
  r = await demo('GET', `/trips/${active._id}/recommendations`);
  ok(r.data.alerts.some((a) => a.id === 'budget') && r.data.suggestions.length > 0, 'seeded demo trip shows live budget alert + suggestions', r.data.alerts.map((a) => a.title));

  section('Places, map, RBAC');
  r = await u('GET', '/places?destination=Hyderabad&category=Historical&sort=cost_asc');
  ok(r.data.places.length >= 3 && r.data.places.every((p) => p.category === 'Historical' && p.destination === 'Hyderabad'), 'places filter destination+category');
  r = await u('GET', '/places?maxPrice=0&crowdLevel=Low');
  ok(r.data.places.every((p) => p.estimatedCost === 0 && p.crowdLevel === 'Low'), 'places filter price+crowd');
  r = await u('GET', '/places?rating=4.6&limit=100');
  ok(r.data.places.length > 0 && r.data.places.every((p) => p.rating >= 4.6), 'places filter rating');
  r = await u('GET', '/places?q=fort');
  ok(r.data.places.length > 3, 'places search');
  r = await u('GET', `/trips/${tripId}/map`);
  ok(r.data.route.distanceKm > 100 && r.data.route.travelTimeLabel && r.data.stops.length > 0, 'map data: route distance/time + stops', r.data.route.travelTimeLabel);
  r = await u('POST', '/places', { name: 'Hack Place', destination: 'Goa', category: 'Nature', latitude: 15, longitude: 73 });
  ok(r.status === 403, 'regular user cannot create places');
  ok((await u('GET', '/admin/users')).status === 403, 'regular user blocked from admin API');
  r = await u('POST', '/trips', { title: 'Unknown town', startingLocation: 'Eluru', destination: 'Narsapur', startDate: iso(3), endDate: iso(4), numberOfTravelers: 1, totalBudget: 5000 });
  ok(r.status === 201 && r.data.trip.itinerary.every((d) => d.places.length > 0), 'unknown destination still gets an itinerary (demo fallback)', r.data.message);

  await admin('POST', '/auth/login', { email: 'admin@pathwise.com', password: 'Admin@123' });
  r = await admin('GET', '/admin/statistics');
  ok(r.data.totals.users >= 7 && r.data.totals.places >= 130 && r.data.usersGrowth.length === 6, 'admin statistics', r.data.totals);
  ok(r.data.expenseByCategory.length > 0 && r.data.topDestinations.length > 0, 'admin chart datasets');
  ok((await admin('GET', '/admin/users')).data.users.length >= 7, 'admin lists users');
  ok((await admin('GET', '/admin/trips')).data.trips.length >= 11, 'admin lists trips');
  ok((await admin('GET', '/admin/expenses')).data.expenses.length >= 20, 'admin lists expenses');
  r = await admin('POST', '/places', { name: 'Test Beach', destination: 'Goa', category: 'Beach', estimatedCost: 10, latitude: 15.5, longitude: 73.8, rating: 4.1 });
  ok(r.status === 201, 'admin creates place', r.data);
  const pid = r.data.place._id;
  r = await admin('PUT', `/places/${pid}`, { name: 'Test Beach Renamed', estimatedCost: 20 });
  ok(r.data.place.name === 'Test Beach Renamed' && r.data.place.estimatedCost === 20, 'admin updates place');
  r = await admin('POST', '/places', { name: 'Bad', destination: 'Goa', category: 'Spaceport', latitude: 999, longitude: 0 });
  ok(r.status === 422, 'place validation (category, latitude)', r.data);
  r = await admin('DELETE', `/places/${pid}`);
  ok(r.status === 200 && (await admin('GET', `/places/${pid}`)).status === 404, 'admin deletes place');

  section('Ownership & cascade delete');
  ok((await other('GET', `/trips/${tripId}`)).status === 404, "other users cannot read someone else's trip");
  ok((await other('DELETE', `/trips/${tripId}`)).status === 404, "other users cannot delete someone else's trip");
  r = await u('DELETE', `/trips/${tripId}`);
  ok(r.status === 200, 'owner deletes trip');
  ok((await u('GET', `/expenses/${tripId}`)).status === 404, 'trip and its expenses are gone');
  ok((await u('GET', '/trips/not-an-id')).status === 400, 'malformed id handled');
  ok((await u('GET', '/nope')).status === 404, 'unknown route -> 404 JSON');
  r = await u('POST', '/auth/logout'); ok(r.status === 200, 'logout');
  ok((await u('GET', '/auth/me')).status === 401, 'session cleared after logout');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
