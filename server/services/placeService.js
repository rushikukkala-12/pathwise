/**
 * Tourist-places service.
 * Order of preference for a destination:
 *   1. Places stored in MongoDB (seed data + admin-managed)
 *   2. OpenTripMap live API (OPENTRIPMAP_API_KEY) – cached into MongoDB
 *   3. Generated generic attractions (demo mode) – cached into MongoDB
 */
const Place = require('../models/Place');
const env = require('../config/env');
const { geocode } = require('./mapService');
const { hash01, round } = require('../utils/geo');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const KIND_TO_CATEGORY = [
  ['beach', 'Beach'], ['natural', 'Nature'], ['historic', 'Historical'], ['architecture', 'Historical'],
  ['museums', 'Culture'], ['cultural', 'Culture'], ['religion', 'Culture'], ['foods', 'Food'],
  ['shops', 'Shopping'], ['amusements', 'Entertainment'], ['sport', 'Adventure'],
];
const DEFAULT_COST = { Nature: 100, Historical: 200, Adventure: 800, Beach: 0, Food: 400, Shopping: 0, Culture: 150, Entertainment: 500 };
const INDOOR = new Set(['Shopping', 'Entertainment', 'Food']);

async function fetchOpenTripMap(destination) {
  const { lat, lng } = await geocode(destination);
  const url = `https://api.opentripmap.com/0.1/en/places/radius?radius=15000&lon=${lng}&lat=${lat}&kinds=interesting_places&rate=2&format=json&limit=15&apikey=${env.openTripMapKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`OpenTripMap ${res.status}`);
  const list = await res.json();
  return list.filter((p) => p.name).map((p) => {
    const category = (KIND_TO_CATEGORY.find(([k]) => (p.kinds || '').includes(k)) || [null, 'Culture'])[1];
    return {
      name: p.name, destination, category, description: `${p.name} is a popular ${category.toLowerCase()} attraction in ${destination}.`,
      location: destination, estimatedCost: DEFAULT_COST[category], rating: round(3.6 + (p.rate || 1) * 0.35, 1),
      popularity: 40 + (p.rate || 1) * 10, crowdLevel: 'Medium', latitude: p.point.lat, longitude: p.point.lon,
      isIndoor: INDOOR.has(category), tags: [category.toLowerCase()], isGenerated: true,
    };
  });
}

async function generateGeneric(destination) {
  const { lat, lng } = await geocode(destination);
  const D = destination;
  const defs = [
    [`${D} City Museum`, 'Culture', 60, 4.3, 'Low', true, ['museum', 'culture']],
    [`${D} Heritage Walk`, 'Historical', 150, 4.4, 'Medium', false, ['heritage', 'photography']],
    [`${D} Central Market`, 'Shopping', 0, 4.1, 'High', false, ['shopping', 'local']],
    [`${D} Botanical Garden`, 'Nature', 50, 4.2, 'Low', false, ['garden', 'relaxation', 'photography']],
    [`${D} Lake Viewpoint`, 'Nature', 0, 4.5, 'Medium', false, ['lake', 'photography', 'relaxation']],
    [`${D} Street Food Trail`, 'Food', 350, 4.6, 'Medium', false, ['food', 'local']],
    [`${D} Adventure Park`, 'Adventure', 900, 4.3, 'Medium', false, ['adventure']],
    [`${D} Cultural Centre`, 'Culture', 120, 4.2, 'Low', true, ['culture', 'art']],
    [`${D} Entertainment Mall`, 'Entertainment', 500, 4.0, 'High', true, ['entertainment', 'shopping']],
    [`${D} Sunset Point`, 'Nature', 0, 4.6, 'Medium', false, ['sunset', 'photography', 'relaxation']],
  ];
  return defs.map(([name, category, cost, rating, crowd, indoor, tags], i) => ({
    name, destination, category, estimatedCost: cost, rating, crowdLevel: crowd, isIndoor: indoor, tags,
    description: `${name} is a well-liked ${category.toLowerCase()} stop for visitors to ${D}.`,
    location: D, popularity: 45 + Math.round(hash01(name) * 40),
    openingTime: indoor ? '10:00' : category === 'Food' ? '11:00' : '06:00', closingTime: indoor ? '20:00' : '21:00',
    bestTimeToVisit: tags.includes('sunset') ? 'Evening' : category === 'Food' ? 'Evening' : 'Morning',
    latitude: round(lat + (hash01(name + 'a') - 0.5) * 0.08, 5), longitude: round(lng + (hash01(name + 'b') - 0.5) * 0.08, 5),
    isGenerated: true,
  }));
}

/** Returns lean place objects for a destination (never empty). */
async function getPlacesForDestination(destination) {
  const rx = new RegExp(`^${escapeRegex(destination.trim())}$`, 'i');
  let places = await Place.find({ destination: rx }).lean();
  if (places.length) return places;

  let fresh = [];
  if (env.openTripMapKey) {
    try { fresh = await fetchOpenTripMap(destination); } catch (e) { console.warn('OpenTripMap failed, using demo places:', e.message); }
  }
  if (!fresh.length) fresh = await generateGeneric(destination);
  const created = await Place.insertMany(fresh);
  return created.map((p) => p.toObject());
}

module.exports = { getPlacesForDestination, escapeRegex };
