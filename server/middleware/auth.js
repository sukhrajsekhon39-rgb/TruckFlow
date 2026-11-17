const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'truckflow-secret-change-me';

module.exports = function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session — please log in again' });
  }
};