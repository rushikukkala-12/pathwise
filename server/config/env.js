require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

const env = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pathwise',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Cookie flags. Defaults suit same-origin deployments (API serves the React build, or a dev proxy).
  // Cross-domain deployments over HTTPS: COOKIE_SECURE=true and COOKIE_SAME_SITE=none
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  openWeatherKey: process.env.OPENWEATHER_API_KEY || '',
  openTripMapKey: process.env.OPENTRIPMAP_API_KEY || '',
  useLiveGeocoding: String(process.env.USE_LIVE_GEOCODING || 'false') === 'true',
};

if (!env.jwtSecret || env.jwtSecret.length < 16) {
  // Never fall back to a hard-coded secret.
  console.error('FATAL: JWT_SECRET is missing or too short. Copy .env.example to .env and set it.');
  process.exit(1);
}

module.exports = env;
