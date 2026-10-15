/**
 * Weather service.
 * Live mode : OpenWeatherMap (OPENWEATHER_API_KEY) – current weather + 5-day forecast.
 * Demo mode : deterministic, climate-aware mock data so the app works with no key.
 * Dates beyond the live forecast window always use the mock model (flagged by `source`).
 */
const env = require('../config/env');
const { geocode } = require('./mapService');
const { hash01, round } = require('../utils/geo');
const { isoDate, addDays, startOfDay } = require('../utils/dates');

const BASE_TEMP = { hyderabad: 31, vizag: 30, visakhapatnam: 30, araku: 25, vijayawada: 33, tirupati: 32, goa: 31, bengaluru: 27, bangalore: 27, chennai: 32, jaipur: 33, delhi: 32, kerala: 29, kochi: 30, eluru: 32 };
const WET_BIAS = { chennai: 0.15, vizag: 0.1, visakhapatnam: 0.1, tirupati: 0.1, kerala: 0.2, kochi: 0.2, goa: 0.1, araku: 0.1, jaipur: -0.12, delhi: -0.1 };
const COLD_NORTH = ['delhi', 'jaipur'];

const BAD = new Set(['Rain', 'Drizzle', 'Thunderstorm', 'Snow']);
const DESCRIPTIONS = { Clear: 'Clear sky', Clouds: 'Partly cloudy', Rain: 'Rain showers', Drizzle: 'Light drizzle', Thunderstorm: 'Thunderstorms', Mist: 'Misty', Snow: 'Snowfall' };

const isBadCondition = (c) => BAD.has(c);
/** A day is unsuitable for outdoor plans when it is wet/stormy or dangerously hot. */
const isOutdoorUnsuitable = (day) => !!day && (isBadCondition(day.condition) || day.tempMax >= 41);

function mockDay(destination, date) {
  const key = destination.toLowerCase().split(',')[0].trim();
  const iso = isoDate(date);
  const month = startOfDay(date).getUTCMonth(); // 0-11
  const r = hash01(`${key}|${iso}|c`);
  const r2 = hash01(`${key}|${iso}|t`);
  const r3 = hash01(`${key}|${iso}|h`);

  let rainP = month >= 5 && month <= 8 ? 0.55 : month >= 9 && month <= 10 ? 0.3 : 0.07;
  rainP = Math.min(0.8, Math.max(0.02, rainP + (WET_BIAS[key] || 0)));

  let condition;
  if (r < rainP * 0.25) condition = 'Thunderstorm';
  else if (r < rainP * 0.8) condition = 'Rain';
  else if (r < rainP) condition = 'Drizzle';
  else if (r < rainP + 0.28) condition = 'Clouds';
  else if (r < rainP + 0.34) condition = 'Mist';
  else condition = 'Clear';

  let base = BASE_TEMP[key] || 30;
  if (month === 11 || month <= 1) base -= COLD_NORTH.includes(key) ? 13 : 5;
  else if (month >= 3 && month <= 5) base += 5;
  else if (month >= 6 && month <= 8) base -= 2;
  if (BAD.has(condition)) base -= 3;
  const tempMax = Math.round(base + (r2 - 0.5) * 4);
  const tempMin = Math.round(tempMax - 7 - r2 * 3);
  const humidity = Math.round((BAD.has(condition) ? 82 : 55) + r3 * 12);
  const rainChance = BAD.has(condition) ? Math.round(65 + r3 * 30) : Math.round(r3 * 25);
  return {
    date: iso, condition, description: DESCRIPTIONS[condition], tempMax, tempMin,
    humidity, windSpeed: round(8 + r3 * 14 + (condition === 'Thunderstorm' ? 12 : 0), 1), rainChance, source: 'mock',
  };
}

const liveCache = new Map();
async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Weather API ${res.status}`);
  return res.json();
}

async function fetchLive(destination) {
  const key = destination.toLowerCase();
  const hit = liveCache.get(key);
  if (hit && Date.now() - hit.at < 30 * 60 * 1000) return hit.data;

  const { lat, lng } = await geocode(destination);
  const q = `lat=${lat}&lon=${lng}&units=metric&appid=${env.openWeatherKey}`;
  const [cur, fc] = await Promise.all([
    fetchJson(`https://api.openweathermap.org/data/2.5/weather?${q}`),
    fetchJson(`https://api.openweathermap.org/data/2.5/forecast?${q}`),
  ]);

  const norm = (c) => (c === 'Haze' || c === 'Fog' || c === 'Smoke' ? 'Mist' : c);
  const byDay = {};
  fc.list.forEach((e) => {
    const d = e.dt_txt.slice(0, 10);
    (byDay[d] = byDay[d] || []).push(e);
  });
  const forecast = Object.entries(byDay).map(([date, list]) => {
    const conds = list.map((e) => norm(e.weather[0].main));
    const worst = conds.find((c) => c === 'Thunderstorm') || conds.find((c) => c === 'Rain') || conds.find((c) => c === 'Drizzle') || conds.find((c) => c === 'Snow');
    const condition = worst || conds.sort((a, b) => conds.filter((x) => x === b).length - conds.filter((x) => x === a).length)[0];
    return {
      date, condition, description: DESCRIPTIONS[condition] || condition,
      tempMax: Math.round(Math.max(...list.map((e) => e.main.temp_max))),
      tempMin: Math.round(Math.min(...list.map((e) => e.main.temp_min))),
      humidity: Math.round(list.reduce((s, e) => s + e.main.humidity, 0) / list.length),
      windSpeed: round(list.reduce((s, e) => s + e.wind.speed, 0) / list.length * 3.6, 1),
      rainChance: Math.round(Math.max(...list.map((e) => (e.pop || 0) * 100))), source: 'live',
    };
  });
  const current = {
    temp: Math.round(cur.main.temp), feelsLike: Math.round(cur.main.feels_like),
    condition: norm(cur.weather[0].main), description: cur.weather[0].description,
    humidity: cur.main.humidity, windSpeed: round(cur.wind.speed * 3.6, 1), source: 'live',
  };
  const data = { current, forecast };
  liveCache.set(key, { at: Date.now(), data });
  return data;
}

/** Current conditions + forecast starting today (or `from`). */
async function getWeather(destination, { days = 7, from } = {}) {
  const start = startOfDay(from || new Date());
  let live = null;
  if (env.openWeatherKey) {
    try { live = await fetchLive(destination); } catch (e) { console.warn('Live weather failed, using demo data:', e.message); }
  }
  const forecast = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    const liveDay = live && live.forecast.find((f) => f.date === isoDate(d));
    forecast.push(liveDay || mockDay(destination, d));
  }
  const today = mockDay(destination, new Date());
  const current = live ? live.current : {
    temp: Math.round((today.tempMax + today.tempMin) / 2 + 2), feelsLike: today.tempMax,
    condition: today.condition, description: today.description, humidity: today.humidity,
    windSpeed: today.windSpeed, source: 'mock',
  };
  const loc = await geocode(destination);
  return { destination, location: loc, source: live ? 'live' : 'mock', current, forecast };
}

/** Map of iso date -> forecast entry for the given list of dates. */
async function getForecastMap(destination, dates) {
  let live = null;
  if (env.openWeatherKey) {
    try { live = await fetchLive(destination); } catch (e) { /* demo fallback */ }
  }
  const out = {};
  dates.forEach((d) => {
    const iso = isoDate(d);
    out[iso] = (live && live.forecast.find((f) => f.date === iso)) || mockDay(destination, d);
  });
  return out;
}

module.exports = { getWeather, getForecastMap, isBadCondition, isOutdoorUnsuitable };
