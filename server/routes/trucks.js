module.exports = require('./crud')(require('../models/Truck'), { sort: { unitNumber: 1 }, label: 'Truck', uniqueField: 'unitNumber' });
