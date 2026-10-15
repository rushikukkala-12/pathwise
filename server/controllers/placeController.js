const Place = require('../models/Place');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { escapeRegex } = require('../services/placeService');

exports.list = asyncHandler(async (req, res) => {
  const { destination, category, minPrice, maxPrice, rating, crowdLevel, q, sort = 'rating' } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 100);
  const filter = {};
  if (destination) filter.destination = new RegExp(`^${escapeRegex(destination)}$`, 'i');
  if (category) filter.category = category;
  if (crowdLevel) filter.crowdLevel = crowdLevel;
  if (rating) filter.rating = { $gte: Number(rating) };
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.estimatedCost = {};
    if (minPrice !== undefined && minPrice !== '') filter.estimatedCost.$gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== '') filter.estimatedCost.$lte = Number(maxPrice);
  }
  if (q) { const rx = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ name: rx }, { description: rx }, { location: rx }]; }

  const sorts = { rating: { rating: -1, popularity: -1 }, cost_asc: { estimatedCost: 1 }, cost_desc: { estimatedCost: -1 }, popularity: { popularity: -1 }, name: { name: 1 } };
  const [places, total] = await Promise.all([
    Place.find(filter).sort(sorts[sort] || sorts.rating).skip((page - 1) * limit).limit(limit).lean(),
    Place.countDocuments(filter),
  ]);
  res.json({ places, total, page, pages: Math.ceil(total / limit) || 1 });
});

exports.destinations = asyncHandler(async (req, res) => {
  const names = await Place.distinct('destination');
  res.json({ destinations: names.sort() });
});

exports.get = asyncHandler(async (req, res) => {
  const place = await Place.findById(req.params.id).lean();
  if (!place) throw ApiError.notFound('Place not found');
  res.json({ place });
});

const FIELDS = ['name', 'destination', 'description', 'category', 'image', 'location', 'estimatedCost', 'rating', 'popularity', 'crowdLevel', 'openingTime', 'closingTime', 'bestTimeToVisit', 'latitude', 'longitude', 'isIndoor', 'tags'];
const pick = (body) => Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

exports.create = asyncHandler(async (req, res) => {
  const place = await Place.create(pick(req.body));
  res.status(201).json({ place });
});

exports.update = asyncHandler(async (req, res) => {
  const place = await Place.findById(req.params.id);
  if (!place) throw ApiError.notFound('Place not found');
  place.set(pick(req.body));
  place.isGenerated = false;
  await place.save();
  res.json({ place });
});

exports.remove = asyncHandler(async (req, res) => {
  const place = await Place.findById(req.params.id);
  if (!place) throw ApiError.notFound('Place not found');
  await place.deleteOne();
  res.json({ message: 'Place deleted' });
});
