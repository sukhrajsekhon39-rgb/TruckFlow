// Blocks cross-site form posts: changing requests must carry a header that only
// our own pages add (other sites can't set custom headers without passing CORS).
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

module.exports = function csrfGuard(req, res, next) {
  if (SAFE.has(req.method)) return next();
  if (req.get('X-Requested-With') !== 'TruckFlow') {
    return res.status(403).json({ error: 'Request blocked. Please reload the page and try again.' });
  }
  next();
};
