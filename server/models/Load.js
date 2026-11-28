const mongoose = require('mongoose');

const loadSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  loadNumber: { type: String, required: true, trim: true },
  status: { type: String, enum: ['Pending', 'In Transit', 'Delivered', 'Invoiced', 'Paid'], default: 'Pending' },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  truck: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck' },
  trailer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trailer' },
  broker: { type: mongoose.Schema.Types.ObjectId, ref: 'Broker' },
  pickup: {
    address: String, city: String, state: String, zip: String,
    scheduledTime: Date, actualTime: Date,
  },
  delivery: {
    address: String, city: String, state: String, zip: String,
    scheduledTime: Date, actualTime: Date,
  },
  rate: { type: Number, default: 0 },
  miles: { type: Number, default: 0 },
  ratePerMile: { type: Number, default: 0 },
  commodity: String,
  weight: Number,
  documents: [{
    name: String,
    type: { type: String, enum: ['BOL', 'Ratecon', 'Lumper Receipt', 'Detention', 'Other'] },
    filePath: String,
    mimetype: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  notes: String,
  invoiceGenerated: { type: Boolean, default: false },
  invoiceDate: Date,
}, { timestamps: true });

loadSchema.pre('save', function(next) {
  this.ratePerMile = this.rate > 0 && this.miles > 0
    ? parseFloat((this.rate / this.miles).toFixed(2))
    : 0;
  next();
});

// Numbers only need to be unique within a company
loadSchema.index({ company: 1, loadNumber: 1 }, { unique: true });

module.exports = mongoose.model('Load', loadSchema);
