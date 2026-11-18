const express = require('express');
const router = express.Router();
const axios = require('axios');

// Address suggestions for the pickup / delivery fields.
// The Geoapify key stays on the server, so it never reaches the browser.
router.get('/autocomplete', async (req, res) => {
  const text = String(req.query.q || '').trim();
  if (text.length < 3) return res.json({ results: [] });

  if (!process.env.GEOAPIFY_KEY) {
    console.error('[places] GEOAPIFY_KEY is not set');
    return res.status(500).json({ error: 'Address search is not configured (missing GEOAPIFY_KEY).' });
  }

  try {
    const { data } = await axios.get('https://api.geoapify.com/v1/geocode/autocomplete', {
      params: {
        text,
        format: 'json',
        limit: 6,
        lang: 'en',
        filter: 'countrycode:us',
        apiKey: process.env.GEOAPIFY_KEY,
      },
      timeout: 8000,
    });

    const results = (data.results || []).map(r => ({
      label: r.formatted,
      address: [r.housenumber, r.street].filter(Boolean).join(' '),
      city: r.city || r.town || r.village || r.hamlet || '',
      state: String(r.state_code || '').toUpperCase(),
      zip: String(r.postcode || '').slice(0, 5),
      lat: r.lat,
      lon: r.lon,
    }));

    res.json({ results });
  } catch (err) {
    console.error('[places] FAILED:', err.response?.status || err.code || err.message);
    res.status(502).json({ error: 'Address search failed.' });
  }
});

module.exports = router;
