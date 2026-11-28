const mongoose = require('mongoose');
const User = require('../models/User');
const { readSession } = require('../utils/security');

// Requires a signed-in user. Sets req.user and req.companyId (the only company this request may touch).
module.exports = async function requireAuth(req, res, next) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: 'Please sign in.' });
  try {
    const user = await User.findById(session.sub).lean();
    // Account deleted, moved, or signed out everywhere since this session was issued
    if (!user || String(user.company) !== session.cid || (user.tokenVersion || 0) !== session.tv) {
      return res.status(401).json({ error: 'Your session has ended. Please sign in again.' });
    }
    req.user = user;
    req.companyId = new mongoose.Types.ObjectId(String(user.company));
    next();
  } catch (err) {
    next(err);
  }
};

module.exports.requireOwner = function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner') return res.status(403).json({ error: 'Only the account owner can do this.' });
  next();
};
