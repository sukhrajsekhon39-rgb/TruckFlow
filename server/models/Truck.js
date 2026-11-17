const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
  unitNumber: { type: String, required: true, unique: true },
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

module.exports = mongoose.model('Truck', truckSchema);
