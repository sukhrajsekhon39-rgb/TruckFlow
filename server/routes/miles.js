const express = require('express');
const router = express.Router();
const axios = require('axios');

const UA = 'TruckFlow/1.0 (contact: sukhrajsekhon39@gmail.com)'; // put a real email here
const http = axios.create({ timeout: 10000, headers: { 'User-Agent': UA } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const why = e => e.response?.status || e.code || e.message;

// ---------- Geocoders (each returns {lat, lon} or null; throws on service errors) ----------

// 1. US Census geocoder: free, no key, made for programmatic use. Needs a street address.
async function viaCensus({ address, city, state, zip }) {
  if (!address || !(city || zip)) return null;
  const oneline = [address, city, state, zip].filter(Boolean).join(', ');
  const { data } = await http.get('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress', {
    params: { address: oneline, benchmark: 'Public_AR_Current', format: 'json' },
  });
  const m = data?.result?.addressMatches?.[0];
  return m ? { lat: Number(m.coordinates.y), lon: Number(m.coordinates.x) } : null;
}

// 2. ZIP centroid
async function viaZip({ zip }) {
  const z = String(zip || '').trim().slice(0, 5);
  if (!/^\d{5}$/.test(z)) return null;
  try {
    const { data } = await http.get(`https://api.zippopotam.us/us/${z}`);
    const p = data?.places?.[0];
    return p ? { lat: parseFloat(p.latitude), lon: parseFloat(p.longitude) } : null;
  } catch (e) {
    if (e.response?.status === 404) return null; // unknown ZIP, not a service failure
    throw e;
  }
}

// 3. City + state centroid
async function viaCityState({ city, state }) {
  if (!city || !state) return null;
  try {
    const { data } = await http.get(
      `https://api.zippopotam.us/us/${encodeURIComponent(state.trim().toLowerCase())}/${encodeURIComponent(city.trim().toLowerCase())}`
    );
    const p = data?.places?.[0];
    return p ? { lat: parseFloat(p.latitude), lon: parseFloat(p.longitude) } : null;
  } catch (e) {
    if (e.response?.status === 404) return null;
    throw e;
  }
}

// 4. Nominatim: last resort (blocks many cloud IPs, and allows 1 request/second)
let lastNominatim = 0;
async function viaNominatim(loc) {
  const q = typeof loc === 'string'
    ? loc
    : [loc.address, loc.city, [loc.state, loc.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  if (!q) return null;
  const wait = lastNominatim + 1100 - Date.now();
  if (wait > 0) await sleep(wait);
  lastNominatim = Date.now();
  const { data } = await http.get('https://nominatim.openstreetmap.org/search', {
    params: { q, format: 'json', limit: 1, countrycodes: 'us' },
  });
  return data.length ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
}

const STEPS = [
  ['census', viaCensus],
  ['zip', viaZip],
  ['city/state', viaCityState],
  ['nominatim', viaNominatim],
];

// Tries each service in order; a failing service just moves on to the next one.
async function geocode(loc, label) {
  const input = typeof loc === 'string' ? { address: loc } : (loc || {});
  const errors = [];
  for (const [name, fn] of STEPS) {
    try {
      const hit = await fn(name === 'nominatim' ? loc : input);
      if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lon)) {
        console.log(`[miles] ${label}: found via ${name}`, hit);
        return { hit, errors };
      }
      console.log(`[miles] ${label}: ${name} -> no match`);
    } catch (e) {
      errors.push(`${name}:${why(e)}`);
      console.error(`[miles] ${label}: ${name} FAILED (${why(e)})`);
    }
  }
  return { hit: null, errors };
}

function haversineMiles(a, b) {
  const R = 3958.8, rad = d => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---------- Route ----------
router.post('/calculate', async (req, res) => {
  try {
    const pickup = req.body.pickup || req.body.pickupAddress;
    const delivery = req.body.delivery || req.body.deliveryAddress;
    console.log('[miles] request:', JSON.stringify({ pickup, delivery }));
    if (!pickup || !delivery) return res.status(400).json({ error: 'Pickup and delivery required' });

    const o = await geocode(pickup, 'pickup');
    const d = await geocode(delivery, 'delivery');

    for (const [r, name] of [[o, 'pickup'], [d, 'delivery']]) {
      if (!r.hit) {
        return r.errors.length
          ? res.status(502).json({ error: `Location lookup services failed for ${name} (${r.errors.join(', ')}).` })
          : res.status(400).json({ error: `Could not find the ${name} location. Check city, state and ZIP.` });
      }
    }
    const origin = o.hit, dest = d.hit;

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=false`;
      const r = await http.get(url);
      if (r.data.code !== 'Ok') throw new Error('OSRM code ' + r.data.code);
      const { distance, duration } = r.data.routes[0];
      const miles = Math.round(distance * 0.000621371);
      console.log('[miles] OSRM route:', miles, 'miles');
      return res.json({ miles, hours: Math.round((duration / 3600) * 10) / 10 });
    } catch (routeErr) {
      console.error('[miles] OSRM FAILED (' + why(routeErr) + '), using straight-line estimate');
      const miles = Math.round(haversineMiles(origin, dest) * 1.2); // rough road factor
      return res.json({ miles, hours: Math.round((miles / 50) * 10) / 10, estimated: true });
    }
  } catch (err) {
    console.error('[miles] UNEXPECTED:', err);
    res.status(500).json({ error: 'Mileage lookup failed. Try again in a moment.' });
  }
});

module.exports = router;
