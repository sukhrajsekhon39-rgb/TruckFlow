const mongoose = require('mongoose');

const brokerSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
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
