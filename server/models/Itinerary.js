const mongoose = require('mongoose');

const placeItemSchema = new mongoose.Schema({
  slot: { type: String, enum: ['Morning', 'Afternoon', 'Evening'], required: true },
  place: { type: mongoose.Schema.Types.ObjectId, ref: 'Place', required: true },
  estimatedCost: { type: Number, default: 0 },      // for the whole group (per-person cost x travelers)
  distanceFromPrevious: { type: Number, default: 0 },
  score: { type: Number, default: 0 },              // recommendation score at the time of planning
  note: { type: String, default: '' },
});

const itinerarySchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
  day: { type: Number, required: true },
  date: { type: Date, required: true },
  places: [placeItemSchema],
  activities: { type: [String], default: [] },
  estimatedCost: { type: Number, default: 0 },
  travelDistance: { type: Number, default: 0 },     // km
  travelTime: { type: Number, default: 0 },         // minutes
  notes: { type: String, default: '' },
});

module.exports = mongoose.model('Itinerary', itinerarySchema);
