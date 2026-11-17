const express = require('express');
const router = express.Router();
const Trailer = require('../models/Trailer');

router.get('/', async (req, res) => {
  try { res.json(await Trailer.find().sort({ unitNumber: 1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/:id', async (req, res) => {
  try {
    const t = await Trailer.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/', async (req, res) => {
  try { res.status(201).json(await new Trailer(req.body).save()); }
  catch (err) { res.status(400).json({ error: err.message }); }
});
router.put('/:id', async (req, res) => {
  try {
    const t = await Trailer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch (err) { res.status(400).json({ error: err.message }); }
});
router.delete('/:id', async (req, res) => {
  try { await Trailer.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
