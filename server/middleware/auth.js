const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/** Accepts the httpOnly cookie (browser) or an Authorization: Bearer token (API clients). */
const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies && req.cookies.pw_token;
  const header = req.headers.authorization;
  if (!token && header && header.startsWith('Bearer ')) token = header.slice(7);
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (e) {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }
  const user = await User.findById(payload.id);
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  req.user = user;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};

module.exports = { protect, authorize };
