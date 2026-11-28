module.exports = require('./crud')(require('../models/Trailer'), { sort: { unitNumber: 1 }, label: 'Trailer', uniqueField: 'unitNumber' });
