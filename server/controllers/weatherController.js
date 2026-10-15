const asyncHandler = require('../utils/asyncHandler');
const { getWeather } = require('../services/weatherService');

exports.get = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 14);
  const from = req.query.from ? new Date(req.query.from) : undefined;
  res.json(await getWeather(req.params.destination, { days, from: from && !isNaN(from) ? from : undefined }));
});
