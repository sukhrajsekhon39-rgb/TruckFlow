require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const auth = require('./middleware/auth');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Public — no auth needed
app.use('/api/auth', require('./routes/auth'));

// Protected — all other routes require a valid JWT
app.use('/api/loads',     auth, require('./routes/loads'));
app.use('/api/trucks',    auth, require('./routes/trucks'));
app.use('/api/drivers',   auth, require('./routes/drivers'));
app.use('/api/trailers',  auth, require('./routes/trailers'));
app.use('/api/brokers',   auth, require('./routes/brokers'));
app.use('/api/analytics', auth, require('./routes/analytics'));
app.use('/api/invoices',  auth, require('./routes/invoices'));
app.use('/api/miles',     auth, require('./routes/miles'));
app.use('/api/places',    auth, require('./routes/places'));
app.use('/api/gmail',     auth, require('./routes/gmail'));

// Serve React build in production
const clientBuild = path.join(__dirname, '../client/build');
app.use(express.static(clientBuild));

// Let React Router handle every non-API route
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  res.sendFile(path.join(clientBuild, 'index.html'));
});

// MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/truckflow';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚚 TruckFlow server running on port ${PORT}`));
