const express = require('express');
const router = express.Router();
const axios = require('axios');

// Geocode an address using Nominatim (free OpenStreetMap geocoding)
async function geocode(address) {
  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: address, format: 'json', limit: 1 },
    headers: { 'User-Agent': 'TruckFlow/1.0' }
  });
  if (!response.data.length) throw new Error(`Could not geocode: ${address}`);
  return { lat: parseFloat(response.data[0].lat), lon: parseFloat(response.data[0].lon) };
}

// Calculate driving distance using OSRM (free routing engine)
router.post('/calculate', async (req, res) => {
  try {
    const { pickupAddress, deliveryAddress } = req.body;
    if (!pickupAddress || !deliveryAddress) {
      return res.status(400).json({ error: 'Both addresses required' });
    }

    const [origin, destination] = await Promise.all([
      geocode(pickupAddress),
      geocode(deliveryAddress)
    ]);

    // OSRM public demo server
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false`;
    const routeResponse = await axios.get(osrmUrl, {
      headers: { 'User-Agent': 'TruckFlow/1.0' }
    });

    if (routeResponse.data.code !== 'Ok') {
      return res.status(400).json({ error: 'Could not calculate route' });
    }

    const distanceMeters = routeResponse.data.routes[0].distance;
    const durationSeconds = routeResponse.data.routes[0].duration;
    const miles = Math.round(distanceMeters * 0.000621371);
    const hours = Math.round(durationSeconds / 3600 * 10) / 10;

    res.json({ miles, hours, origin, destination });
  } catch (err) {
    // Fallback: straight-line haversine estimate
    console.error('Route calc error:', err.message);
    res.status(500).json({ error: 'Could not calculate miles. Check addresses and try again.' });
  }
});

module.exports = router;
