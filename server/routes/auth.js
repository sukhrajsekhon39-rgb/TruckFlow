const express = require('express');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Company = require('../models/Company');
const requireAuth = require('../middleware/auth');
const { requireOwner } = require('../middleware/auth');
const {
  issueSession, clearSession, passwordProblem, hashPassword, checkPassword, DUMMY_HASH,
  cleanEmail, validEmail, newResetToken, sha256, serverError,
} = require('../utils/security');
const { sendMail, appUrl } = require('../utils/mailer');

const router = express.Router();

const MAX_FAILED = 8;              // failed sign-ins before the account pauses
const LOCK_MINUTES = 15;
const RESET_MINUTES = 30;

const limiter = (windowMin, max, keyFn) => rateLimit({
  windowMs: windowMin * 60 * 1000,
  limit: max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: keyFn || (req => req.ip),
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});
const loginLimiter  = limiter(15, 20, req => `${req.ip}|${cleanEmail(req.body?.email)}`);
const signupLimiter = limiter(60, 10);
const resetLimiter  = limiter(60, 8);

const companyJSON = c => c && ({
  id: c._id, name: c.name, phone: c.phone || '', email: c.email || '', website: c.website || '',
  address: c.address || '', mc: c.mc || '', dot: c.dot || '',
});
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// POST /api/auth/signup — create a company and its owner account
router.post('/signup', signupLimiter, async (req, res) => {
  const name = str(req.body?.name, 100);
  const companyName = str(req.body?.companyName, 120);
  const email = cleanEmail(req.body?.email);
  const password = req.body?.password;

  if (!name) return res.status(400).json({ error: 'Enter your name.', field: 'name' });
  if (!companyName) return res.status(400).json({ error: 'Enter your company name.', field: 'companyName' });
  if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.', field: 'email' });
  const pwErr = passwordProblem(password);
  if (pwErr) return res.status(400).json({ error: pwErr, field: 'password' });

  let company;
  try {
    if (await User.exists({ email })) {
      return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.', field: 'email' });
    }
    company = await Company.create({ name: companyName, email });
    const user = await User.create({
      name, email, company: company._id, role: 'owner',
      passwordHash: await hashPassword(password),
      lastLoginAt: new Date(),
    });
    issueSession(res, user);
    res.status(201).json({ user: user.toSafeJSON(), company: companyJSON(company) });
  } catch (err) {
    if (company) await Company.deleteOne({ _id: company._id }).catch(() => {});
    if (err?.code === 11000) return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.', field: 'email' });
    serverError(res, err);
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const password = req.body?.password;
  const wrong = () => res.status(401).json({ error: 'That email and password don’t match an account.' });
  if (!email || typeof password !== 'string' || !password) return res.status(400).json({ error: 'Enter your email and password.' });

  try {
    const user = await User.findOne({ email }).select('+passwordHash +failedLogins +lockUntil');
    if (!user) { await checkPassword(password, DUMMY_HASH); return wrong(); }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(429).json({ error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}, or reset your password.` });
    }

    if (!(await checkPassword(password, user.passwordHash))) {
      user.failedLogins = (user.failedLogins || 0) + 1;
      if (user.failedLogins >= MAX_FAILED) {
        user.failedLogins = 0;
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
      }
      await user.save();
      return wrong();
    }

    user.failedLogins = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();
    const company = await Company.findById(user.company).lean();
    issueSession(res, user);
    res.json({ user: user.toSafeJSON(), company: companyJSON(company) });
  } catch (err) { serverError(res, err); }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => { clearSession(res); res.json({ ok: true }); });

// POST /api/auth/forgot — always answers the same way, so it can't be used to find accounts
router.post('/forgot', resetLimiter, async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const done = () => res.json({ ok: true, message: 'If an account exists for that email, a reset link is on its way.' });
  if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  try {
    const user = await User.findOne({ email });
    if (!user) return done();
    const { token, hash } = newResetToken();
    user.resetTokenHash = hash;
    user.resetTokenExpires = new Date(Date.now() + RESET_MINUTES * 60000);
    await user.save();
    const link = `${appUrl()}/reset-password?token=${token}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your TruckFlow password',
      text: `Hi ${user.name},\n\nUse this link to choose a new TruckFlow password. It works once and expires in ${RESET_MINUTES} minutes.\n\n${link}\n\nIf you didn't ask for this, you can ignore this email; your password stays the same.`,
      html: `<p>Hi ${escapeHtml(user.name)},</p><p>Use this link to choose a new TruckFlow password. It works once and expires in ${RESET_MINUTES} minutes.</p><p><a href="${link}">Reset my password</a></p><p>If you didn't ask for this, you can ignore this email; your password stays the same.</p>`,
    });
    done();
  } catch (err) { serverError(res, err); }
});

// POST /api/auth/reset — set a new password with an emailed token
router.post('/reset', resetLimiter, async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  const password = req.body?.password;
  if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'This reset link is invalid. Request a new one.' });
  const pwErr = passwordProblem(password);
  if (pwErr) return res.status(400).json({ error: pwErr, field: 'password' });
  try {
    const user = await User.findOne({ resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'This reset link has expired or was already used. Request a new one.' });
    user.passwordHash = await hashPassword(password);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    user.failedLogins = 0;
    user.lockUntil = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // sign out every other session
    user.lastLoginAt = new Date();
    await user.save();
    const company = await Company.findById(user.company).lean();
    issueSession(res, user);
    res.json({ user: user.toSafeJSON(), company: companyJSON(company) });
  } catch (err) { serverError(res, err); }
});

// ── Signed-in account actions ──

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const company = await Company.findById(req.companyId).lean();
    res.json({ user: user.toSafeJSON(), company: companyJSON(company) });
  } catch (err) { serverError(res, err); }
});

// PATCH /api/auth/me — name, and email (email needs the current password)
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (req.body?.name !== undefined) {
      const name = str(req.body.name, 100);
      if (!name) return res.status(400).json({ error: 'Enter your name.', field: 'name' });
      user.name = name;
    }
    if (req.body?.email !== undefined) {
      const email = cleanEmail(req.body.email);
      if (email !== user.email) {
        if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.', field: 'email' });
        if (!(await checkPassword(req.body.currentPassword, user.passwordHash))) {
          return res.status(400).json({ error: 'Your current password is incorrect.', field: 'currentPassword' });
        }
        if (await User.exists({ email, _id: { $ne: user._id } })) {
          return res.status(409).json({ error: 'Another account already uses this email.', field: 'email' });
        }
        user.email = email;
      }
    }
    await user.save();
    res.json({ user: user.toSafeJSON() });
  } catch (err) { serverError(res, err); }
});

// POST /api/auth/password — change password; other sessions are signed out
router.post('/password', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await checkPassword(req.body?.currentPassword, user.passwordHash))) {
      return res.status(400).json({ error: 'Your current password is incorrect.', field: 'currentPassword' });
    }
    const pwErr = passwordProblem(req.body?.newPassword);
    if (pwErr) return res.status(400).json({ error: pwErr, field: 'newPassword' });
    user.passwordHash = await hashPassword(req.body.newPassword);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    issueSession(res, user); // keep this device signed in
    res.json({ ok: true });
  } catch (err) { serverError(res, err); }
});

// POST /api/auth/logout-all — end every session, including this one
router.post('/logout-all', requireAuth, async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    clearSession(res);
    res.json({ ok: true });
  } catch (err) { serverError(res, err); }
});

// GET/PUT /api/auth/company — company profile (used on invoices)
router.get('/company', requireAuth, async (req, res) => {
  try { res.json({ company: companyJSON(await Company.findById(req.companyId).lean()) }); }
  catch (err) { serverError(res, err); }
});

router.put('/company', requireAuth, requireOwner, async (req, res) => {
  try {
    const update = {};
    for (const k of Company.EDITABLE) if (req.body?.[k] !== undefined) update[k] = str(req.body[k], 300);
    if (update.name === '') return res.status(400).json({ error: 'Company name can’t be empty.', field: 'name' });
    const company = await Company.findByIdAndUpdate(req.companyId, update, { new: true, runValidators: true }).lean();
    res.json({ company: companyJSON(company) });
  } catch (err) { serverError(res, err); }
});

// DELETE /api/auth/account — owner deletes the company and all of its data
router.delete('/account', requireAuth, requireOwner, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await checkPassword(req.body?.password, user.passwordHash))) {
      return res.status(400).json({ error: 'Your password is incorrect.', field: 'password' });
    }
    const company = req.companyId;
    const models = ['Load', 'Driver', 'Truck', 'Trailer', 'Broker'].map(n => require(`../models/${n}`));
    const loads = await models[0].find({ company }, 'documents.filePath').lean();
    for (const l of loads) for (const d of l.documents || []) {
      if (d.filePath) fs.promises.unlink(d.filePath).catch(() => {});
    }
    await Promise.all(models.map(M => M.deleteMany({ company })));
    await User.deleteMany({ company });
    await Company.deleteOne({ _id: company });
    clearSession(res);
    res.json({ ok: true });
  } catch (err) { serverError(res, err); }
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

module.exports = router;
