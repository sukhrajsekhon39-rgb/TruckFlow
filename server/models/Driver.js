const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  email: String,
  licenseNumber: String,
  licenseExpiry: Date,
  status: { type: String, enum: ['Active', 'Inactive', 'On Load'], default: 'Active' },
  homeBase: String,
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
