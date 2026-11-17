const mongoose = require('mongoose');

const brokerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: String,
  phone: String,
  email: String,
  address: String,
  mcNumber: String,
  paymentTerms: { type: Number, default: 30 }, // days
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('Broker', brokerSchema);
