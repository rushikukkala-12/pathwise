const R = 6371;
const rad = (d) => (d * Math.PI) / 180;

/** Great-circle distance between two lat/lng points in km. */
function haversine(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return 0;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

/** Stable string hash -> 0..1 (used by the deterministic mock services). */
function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

module.exports = { haversine, round, hash01 };
