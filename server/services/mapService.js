/**
 * Maps / location service.
 * - Built-in gazetteer of Indian cities (works offline, no key required)
 * - Optional live geocoding through OpenStreetMap Nominatim (USE_LIVE_GEOCODING=true, no API key)
 * - Deterministic fallback so ANY place name still resolves to a coordinate in demo mode
 */
const env = require('../config/env');
const { haversine, round, hash01 } = require('../utils/geo');

const CITIES = {
  hyderabad: [17.385, 78.4867], vizag: [17.6868, 83.2185], visakhapatnam: [17.6868, 83.2185],
  araku: [18.3273, 82.8775], 'araku valley': [18.3273, 82.8775], vijayawada: [16.5062, 80.648],
  tirupati: [13.6288, 79.4192], goa: [15.4909, 73.8278], bengaluru: [12.9716, 77.5946], bangalore: [12.9716, 77.5946],
  chennai: [13.0827, 80.2707], jaipur: [26.9124, 75.7873], delhi: [28.6139, 77.209], 'new delhi': [28.6139, 77.209],
  kerala: [9.9312, 76.2673], kochi: [9.9312, 76.2673], eluru: [16.7107, 81.0952], mumbai: [19.076, 72.8777],
  kolkata: [22.5726, 88.3639], pune: [18.5204, 73.8567], guntur: [16.3067, 80.4365], rajahmundry: [17.0005, 81.804],
  warangal: [17.9689, 79.5941], nellore: [14.4426, 79.9865], kakinada: [16.9891, 82.2475], ahmedabad: [23.0225, 72.5714],
  lucknow: [26.8467, 80.9462], varanasi: [25.3176, 82.9739], agra: [27.1767, 78.0081], udaipur: [24.5854, 73.7125],
  manali: [32.2396, 77.1887], shimla: [31.1048, 77.1734], mysuru: [12.2958, 76.6394], mysore: [12.2958, 76.6394],
  coimbatore: [11.0168, 76.9558], madurai: [9.9252, 78.1198], munnar: [10.0889, 77.0595], ooty: [11.41, 76.695],
  nagpur: [21.1458, 79.0882], bhopal: [23.2599, 77.4126], indore: [22.7196, 75.8577], kurnool: [15.8281, 78.0373],
  anantapur: [14.6819, 77.6006], ongole: [15.5057, 80.0499], khammam: [17.2473, 80.1514], karimnagar: [18.4386, 79.1288],
};

const cache = new Map();

async function liveGeocode(name) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(name + ', India')}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'PathWise/1.0 (tourism planner)' }, signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const [hit] = await res.json();
  if (!hit) return null;
  return { lat: Number(hit.lat), lng: Number(hit.lon) };
}

async function geocode(rawName) {
  const name = String(rawName || '').trim();
  const key = name.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  let result;
  const known = CITIES[key] || CITIES[key.split(',')[0].trim()];
  if (known) {
    result = { name, lat: known[0], lng: known[1], approximate: false, source: 'gazetteer' };
  } else {
    if (env.useLiveGeocoding) {
      try {
        const live = await liveGeocode(name);
        if (live) result = { name, ...live, approximate: false, source: 'openstreetmap' };
      } catch (e) { /* fall through to mock */ }
    }
    if (!result) {
      // Deterministic pseudo-location inside India so the UI still works for unknown names
      const lat = 9 + hash01(key + 'lat') * 20;
      const lng = 72 + hash01(key + 'lng') * 15;
      result = { name, lat: round(lat, 4), lng: round(lng, 4), approximate: true, source: 'mock' };
    }
  }
  cache.set(key, result);
  return result;
}

/** Distance / travel-time estimate between two named locations. */
async function getRoute(from, to) {
  const [a, b] = await Promise.all([geocode(from), geocode(to)]);
  const straightKm = haversine(a, b);
  const roadKm = straightKm * 1.3;
  const sameCity = straightKm < 5;
  const route = {
    from: a, to: b,
    straightKm: round(straightKm),
    distanceKm: round(roadKm),
    byRoad: { hours: round(roadKm / 50, 1) },
    byAir: null,
  };
  if (!sameCity && straightKm > 500) route.byAir = { hours: round(straightKm / 700 + 2.5, 1) };
  route.travelTimeLabel = formatHours((route.byAir || route.byRoad).hours);
  route.recommendedMode = route.byAir ? 'Flight' : sameCity ? 'Local transport' : 'Road / Train';
  return route;
}

function formatHours(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (!hrs) return `${mins} min`;
  return mins ? `${hrs} h ${mins} min` : `${hrs} h`;
}

module.exports = { geocode, getRoute, formatHours };
