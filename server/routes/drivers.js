module.exports = require('./crud')(require('../models/Driver'), { sort: { name: 1 }, label: 'Driver' });
