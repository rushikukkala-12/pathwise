const jwt = require('jsonwebtoken');
const env = require('../config/env');

const sign = (user) => jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const cookieOptions = () => ({
  httpOnly: true,                       // not readable from JavaScript (XSS safe)
  secure: env.cookieSecure,             // HTTPS only when enabled (default: production)
  sameSite: env.cookieSameSite,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
});

function sendAuth(res, user, status = 200) {
  const token = sign(user);
  res.cookie('pw_token', token, cookieOptions());
  res.status(status).json({ user: user.toSafeJSON(), token });
}

module.exports = { sign, sendAuth, cookieOptions };
