const express = require('express');
const router = express.Router();
const Broker = require('../models/Broker');

router.get('/', async (req, res) => {
  try { res.json(await Broker.find().sort({ name: 1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/:id', async (req, res) => {
  try {
    const b = await Broker.findById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json(b);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/', async (req, res) => {
  try { res.status(201).json(await new Broker(req.body).save()); }
  catch (err) { res.status(400).json({ error: err.message }); }
});
router.put('/:id', async (req, res) => {
  try {
    const b = await Broker.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json(b);
  } catch (err) { res.status(400).json({ error: err.message }); }
});
router.delete('/:id', async (req, res) => {
  try { await Broker.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
