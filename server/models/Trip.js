const mongoose = require('mongoose');

const INTERESTS = ['Nature', 'Adventure', 'Historical', 'Beaches', 'Food', 'Shopping', 'Culture', 'Photography', 'Entertainment', 'Relaxation'];

const tripSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: [true, 'Trip name is required'], trim: true, maxlength: 100 },
  startingLocation: { type: String, required: [true, 'Starting location is required'], trim: true },
  destination: { type: String, required: [true, 'Destination is required'], trim: true },
  startDate: { type: Date, required: [true, 'Start date is required'] },
  endDate: { type: Date, required: [true, 'End date is required'] },
  numberOfDays: { type: Number, required: true, min: 1 },
  numberOfTravelers: { type: Number, default: 1, min: [1, 'At least one traveler is required'], max: 50 },
  totalBudget: { type: Number, required: [true, 'Budget is required'], min: [1, 'Budget must be greater than zero'] },
  interests: { type: [{ type: String, enum: INTERESTS }], default: [] },
  status: { type: String, enum: ['Planned', 'Active', 'Completed', 'Cancelled'], default: 'Planned' },
  estimatedCost: { type: Number, default: 0 },
  actualSpent: { type: Number, default: 0 },
  remainingBudget: { type: Number, default: 0 },
  // References to Itinerary day documents (the Itinerary collection is the source of truth)
  itinerary: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Itinerary' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

tripSchema.pre('save', function touch(next) {
  this.updatedAt = new Date();
  next();
});

tripSchema.statics.INTERESTS = INTERESTS;
module.exports = mongoose.model('Trip', tripSchema);
