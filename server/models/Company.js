const mongoose = require('mongoose');

// A trucking company (tenant). Every driver, truck, trailer, broker and load belongs to exactly one.
const companySchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true, maxlength: 120 },
  phone:   { type: String, trim: true, maxlength: 40 },
  email:   { type: String, trim: true, lowercase: true, maxlength: 254 },
  website: { type: String, trim: true, maxlength: 200 },
  address: { type: String, trim: true, maxlength: 300 },
  mc:      { type: String, trim: true, maxlength: 30 },
  dot:     { type: String, trim: true, maxlength: 30 },
  loadSeq: { type: Number, default: 0 }, // last auto load number used (TF-00001, ...)
}, { timestamps: true });

// Fields an owner may edit from Settings
companySchema.statics.EDITABLE = ['name', 'phone', 'email', 'website', 'address', 'mc', 'dot'];

module.exports = mongoose.model('Company', companySchema);
