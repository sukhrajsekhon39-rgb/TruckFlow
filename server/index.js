require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const requireAuth = require('./middleware/auth');
const csrfGuard = require('./middleware/csrf');
const { IS_PROD } = require('./utils/security');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Add a long random value to server/.env (for example: openssl rand -hex 48).');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) console.warn('⚠️  JWT_SECRET is short. Use at least 32 random characters.');

const app = express();
app.disable('x-powered-by');
app.set('query parser', 'simple'); // ?a[b]=c stays a plain string, so it can't become a database operator
// Which proxies may report the visitor's real IP (used by the rate limits).
// On Render, its load balancer is the one hop in front of the app. Elsewhere the default is
// only a proxy on this machine (the React dev server, or Nginx on the same box).
// Other hosts with a load balancer (Heroku, Railway...): set TRUST_PROXY=1.
const trustProxy = process.env.TRUST_PROXY
  ? (Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY)
  : (process.env.RENDER ? 1 : 'loopback');
app.set('trust proxy', trustProxy);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'img-src': ["'self'", 'data:', 'blob:'],
      'frame-src': ["'self'", 'blob:'],
      'connect-src': ["'self'"],
      'object-src': ["'none'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': IS_PROD ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// API: CSRF guard, a general rate limit, and no caching of private data
app.use('/api', csrfGuard);
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

// Public: sign up, sign in, password reset (account actions inside check the session themselves)
app.use('/api/auth', require('./routes/auth'));

// Everything else needs a signed-in user, and only sees that user's company
app.use('/api/loads',     requireAuth, require('./routes/loads'));
app.use('/api/trucks',    requireAuth, require('./routes/trucks'));
app.use('/api/drivers',   requireAuth, require('./routes/drivers'));
app.use('/api/trailers',  requireAuth, require('./routes/trailers'));
app.use('/api/brokers',   requireAuth, require('./routes/brokers'));
app.use('/api/analytics', requireAuth, require('./routes/analytics'));
app.use('/api/invoices',  requireAuth, require('./routes/invoices'));
app.use('/api/miles',     requireAuth, require('./routes/miles'));
app.use('/api/places',    requireAuth, require('./routes/places'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Serve the React build in production
const clientBuild = path.join(__dirname, '../client/build');
app.use(express.static(clientBuild, { index: false }));
app.get('*', (req, res) => res.sendFile(path.join(clientBuild, 'index.html')));

// Last-resort error handler: never leak internals in production
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return;
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  res.status(err.status || 500).json({ error: IS_PROD ? 'Something went wrong. Please try again.' : err.message });
});

// MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/truckflow';
mongoose.set('strictQuery', true);
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await dropLegacyIndexes();
  })
  .catch(err => console.error('MongoDB error:', err));

// Load and unit numbers used to be unique across the whole database. They're now unique per company,
// so the old single-field unique indexes are removed (the new per-company ones are created by Mongoose).
async function dropLegacyIndexes() {
  const legacy = [['Load', 'loadNumber_1'], ['Truck', 'unitNumber_1'], ['Trailer', 'unitNumber_1']];
  for (const [model, index] of legacy) {
    try {
      const coll = mongoose.model(model).collection;
      if (await coll.indexExists(index)) { await coll.dropIndex(index); console.log(`Dropped old index ${model}.${index}`); }
      await mongoose.model(model).createIndexes();
    } catch (err) {
      if (err.codeName !== 'NamespaceNotFound') console.warn(`Index check for ${model}:`, err.message);
    }
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚚 TruckFlow server running on port ${PORT}`));
