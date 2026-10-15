const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendAuth, cookieOptions } = require('../utils/token');

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.findOne({ email: String(email).toLowerCase() })) throw new ApiError(409, 'An account with this email already exists');
  // Role is never taken from the request body – public sign-ups are always regular users.
  const user = await User.create({ name, email, password, role: 'user' });
  sendAuth(res, user, 201);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw ApiError.unauthorized('Incorrect email or password');
  sendAuth(res, user);
});

exports.logout = (req, res) => {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie('pw_token', opts);
  res.json({ message: 'Signed out' });
};

exports.me = (req, res) => res.json({ user: req.user.toSafeJSON() });

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, profileImage } = req.body;
  if (name !== undefined) req.user.name = name;
  if (profileImage !== undefined) req.user.profileImage = profileImage;
  await req.user.save();
  res.json({ user: req.user.toSafeJSON() });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(req.body.currentPassword))) throw ApiError.badRequest('Current password is incorrect');
  user.password = req.body.newPassword;
  await user.save();
  res.json({ message: 'Password updated' });
});
