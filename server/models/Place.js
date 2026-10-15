const mongoose = require('mongoose');

const CATEGORIES = ['Nature', 'Historical', 'Adventure', 'Beach', 'Food', 'Shopping', 'Culture', 'Entertainment'];

const placeSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Place name is required'], trim: true },
  destination: { type: String, required: [true, 'Destination is required'], trim: true, index: true },
  description: { type: String, default: '' },
  category: { type: String, enum: { values: CATEGORIES, message: 'Invalid category' }, required: true },
  image: { type: String, default: '' },
  location: { type: String, default: '' },
  estimatedCost: { type: Number, default: 0, min: [0, 'Cost cannot be negative'] },   // per person, INR
  rating: { type: Number, default: 4, min: 0, max: 5 },
  popularity: { type: Number, default: 50, min: 0, max: 100 },
  crowdLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  openingTime: { type: String, default: '09:00' },
  closingTime: { type: String, default: '18:00' },
  bestTimeToVisit: { type: String, enum: ['Morning', 'Afternoon', 'Evening', 'Anytime'], default: 'Anytime' },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  // Extra fields that power the recommendation engine
  isIndoor: { type: Boolean, default: false },
  tags: { type: [String], default: [] },
  isGenerated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

placeSchema.statics.CATEGORIES = CATEGORIES;
module.exports = mongoose.model('Place', placeSchema);
