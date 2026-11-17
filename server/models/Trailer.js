const mongoose = require('mongoose');

const trailerSchema = new mongoose.Schema({
  unitNumber: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Lowboy', 'Other'] },
  length: Number,
  make: String,
  year: Number,
  vin: String,
  licensePlate: String,
  state: String,
  status: { type: String, enum: ['Active', 'In Shop', 'Out of Service'], default: 'Active' },
  insuranceExpiry: Date,
  registrationExpiry: Date,
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('Trailer', trailerSchema);
