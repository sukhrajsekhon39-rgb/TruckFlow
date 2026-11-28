const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  unitNumber: { type: String, required: true, trim: true },
  make: String,
  model: String,
  year: Number,
  vin: String,
  licensePlate: String,
  state: String,
  status: { type: String, enum: ['Active', 'In Shop', 'Out of Service'], default: 'Active' },
  mileage: Number,
  nextServiceMiles: Number,
  insuranceExpiry: Date,
  registrationExpiry: Date,
  notes: String,
}, { timestamps: true });

// Numbers only need to be unique within a company
truckSchema.index({ company: 1, unitNumber: 1 }, { unique: true });

module.exports = mongoose.model('Truck', truckSchema);
