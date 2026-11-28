const mongoose = require('mongoose');

const trailerSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  unitNumber: { type: String, required: true, trim: true },
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

// Numbers only need to be unique within a company
trailerSchema.index({ company: 1, unitNumber: 1 }, { unique: true });

module.exports = mongoose.model('Trailer', trailerSchema);
