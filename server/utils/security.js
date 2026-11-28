const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE = 'tf_session';
const SESSION_DAYS = 7;
const BCRYPT_ROUNDS = 12;

function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set. Add a long random value to server/.env');
  return s;
}

// ── Sessions: a signed token in an httpOnly cookie (page scripts can't read it) ──
function issueSession(res, user) {
  const token = jwt.sign(
    { sub: String(user._id), cid: String(user.company), tv: user.tokenVersion || 0 },
    jwtSecret(),
    { algorithm: 'HS256', expiresIn: `${SESSION_DAYS}d`, issuer: 'truckflow' },
  );
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearSession(res) {
  res.clearCookie(COOKIE, { httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/' });
}

function readSession(req) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  try {
    return jwt.verify(token, jwtSecret(), { algorithms: ['HS256'], issuer: 'truckflow' });
  } catch {
    return null;
  }
}

// ── Passwords ──
function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Use at least 10 characters.';
  if (Buffer.byteLength(pw, 'utf8') > 72) return 'Use 72 characters or fewer.';
  if (!/[A-Za-z]/.test(pw) || !/[0-9\W_]/.test(pw)) return 'Mix letters with at least one number or symbol.';
  return null;
}
const hashPassword = pw => bcrypt.hash(pw, BCRYPT_ROUNDS);
const checkPassword = (pw, hash) => bcrypt.compare(String(pw || ''), hash);
// Compared against when no account matches, so a wrong email takes as long as a wrong password
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanEmail = e => (typeof e === 'string' ? e.trim().toLowerCase() : '');
const validEmail = e => EMAIL_RE.test(e) && e.length <= 254;

// ── Reset tokens: the raw token is emailed, only its hash is stored ──
function newResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: sha256(token) };
}
const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');

// ── Tenant helpers ──
// Strip fields a client must never set (ownership, ids, server-managed fields)
function cleanBody(body, extraBlocked = []) {
  const out = { ...(body && typeof body === 'object' ? body : {}) };
  for (const k of ['company', '_id', 'id', '__v', 'createdAt', 'updatedAt', ...extraBlocked]) delete out[k];
  return out;
}

const isId = v => mongoose.isValidObjectId(v);
const escapeRegex = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function serverError(res, err) {
  console.error(err);
  res.status(500).json({ error: IS_PROD ? 'Something went wrong. Please try again.' : err.message });
}

module.exports = {
  IS_PROD, COOKIE, issueSession, clearSession, readSession,
  passwordProblem, hashPassword, checkPassword, DUMMY_HASH,
  cleanEmail, validEmail, newResetToken, sha256,
  cleanBody, isId, escapeRegex, serverError,
};
