const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'truckflow-secret-change-me';
const JWT_EXPIRES = '7d';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password required' });

    const validUser = process.env.APP_USERNAME || 'admin';
    const validHash = process.env.APP_PASSWORD_HASH;
    const validPassword = process.env.APP_PASSWORD || 'truckflow2024';

    // Username check
    if (username.toLowerCase() !== validUser.toLowerCase())
      return res.status(401).json({ error: 'Invalid credentials' });

    // Password check — use bcrypt hash if set, else plain comparison
    let valid = false;
    if (validHash) {
      valid = await bcrypt.compare(password, validHash);
    } else {
      valid = password === validPassword;
    }

    if (!valid)
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ username: validUser }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ token, username: validUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify — check if token is still valid
router.get('/verify', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    res.json({ valid: true, username: decoded.username });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;