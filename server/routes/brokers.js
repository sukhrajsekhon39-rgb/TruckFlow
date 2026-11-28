module.exports = require('./crud')(require('../models/Broker'), { sort: { name: 1 }, label: 'Broker' });
