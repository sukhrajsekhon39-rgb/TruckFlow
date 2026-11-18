const express = require('express');
const router = express.Router();
const axios = require('axios');

const UA = 'TruckFlow/1.0 (contact: your-email@example.com)'; // use a real email
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function nominatim(q) {
  const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q, format: 'json', limit: 1, countrycodes: 'us' },
    headers: { 'User-Agent': UA },
    timeout: 10000,
  });
  return data.length ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
}

// Most specific first, then fall back to city/state/zip, then zip alone
async function geocode({ address, city, state, zip }) {
  const tail = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const attempts = [
    address && tail ? `${address}, ${tail}` : null,
    tail || null,
    zip || null,
  ].filter(Boolean);

  for (const q of attempts) {
    const hit = await nominatim(q);
    await sleep(1100); // Nominatim limit: 1 request per second
    if (hit) return hit;
  }
  return null;
}

function haversineMiles(a, b) {
  const R = 3958.8, rad = d => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

router.post('/calculate', async (req, res) => {
  try {
    const { pickup, delivery } = req.body;
    if (!pickup || !delivery) return res.status(400).json({ error: 'Pickup and delivery required' });

    const origin = await geocode(pickup);          // sequential, not Promise.all
    if (!origin) return res.status(400).json({ error: 'Could not find the pickup location. Check city/state/ZIP.' });
    const dest = await geocode(delivery);
    if (!dest) return res.status(400).json({ error: 'Could not find the delivery location. Check city/state/ZIP.' });

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=false`;
      const r = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 10000 });
      if (r.data.code !== 'Ok') throw new Error('OSRM: ' + r.data.code);
      const { distance, duration } = r.data.routes[0];
      return res.json({
        miles: Math.round(distance * 0.000621371),
        hours: Math.round((duration / 3600) * 10) / 10,
      });
    } catch (routeErr) {
      console.error('OSRM failed, using estimate:', routeErr.message);
      const miles = Math.round(haversineMiles(origin, dest) * 1.2); // road factor
      return res.json({ miles, hours: Math.round((miles / 50) * 10) / 10, estimated: true });
    }
  } catch (err) {
    console.error('Route calc error:', err.response?.status, err.message);
    res.status(500).json({ error: 'Mileage lookup failed. Try again in a moment.' });
  }
});

module.exports = router;
