const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');

router.get('/', async (req, res) => {
  try { res.json(await Driver.find().sort({ name: 1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/:id', async (req, res) => {
  try {
    const d = await Driver.findById(req.params.id);
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json(d);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/', async (req, res) => {
  try { res.status(201).json(await new Driver(req.body).save()); }
  catch (err) { res.status(400).json({ error: err.message }); }
});
router.put('/:id', async (req, res) => {
  try {
    const d = await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json(d);
  } catch (err) { res.status(400).json({ error: err.message }); }
});
router.delete('/:id', async (req, res) => {
  try { await Driver.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
