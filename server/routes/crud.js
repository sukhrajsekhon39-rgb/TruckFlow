const express = require('express');
const { cleanBody, isId, serverError } = require('../utils/security');

// Company-scoped CRUD routes. Every query includes { company: req.companyId },
// so one company can never read or change another company's records.
module.exports = function crudRoutes(Model, { sort, label, uniqueField }) {
  const router = express.Router();
  const own = (req, extra = {}) => ({ ...extra, company: req.companyId });
  const dupMessage = `Another ${label.toLowerCase()} already uses that ${uniqueField === 'unitNumber' ? 'unit number' : 'value'}.`;

  const fail = (res, err) => {
    if (err?.code === 11000) return res.status(409).json({ error: dupMessage });
    if (err?.name === 'ValidationError' || err?.name === 'CastError') return res.status(400).json({ error: err.message });
    serverError(res, err);
  };

  router.get('/', async (req, res) => {
    try { res.json(await Model.find(own(req)).sort(sort)); }
    catch (err) { fail(res, err); }
  });

  router.get('/:id', async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).json({ error: `${label} not found` });
    try {
      const doc = await Model.findOne(own(req, { _id: req.params.id }));
      if (!doc) return res.status(404).json({ error: `${label} not found` });
      res.json(doc);
    } catch (err) { fail(res, err); }
  });

  router.post('/', async (req, res) => {
    try { res.status(201).json(await Model.create({ ...cleanBody(req.body), company: req.companyId })); }
    catch (err) { fail(res, err); }
  });

  router.put('/:id', async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).json({ error: `${label} not found` });
    try {
      const doc = await Model.findOneAndUpdate(own(req, { _id: req.params.id }), cleanBody(req.body), { new: true, runValidators: true });
      if (!doc) return res.status(404).json({ error: `${label} not found` });
      res.json(doc);
    } catch (err) { fail(res, err); }
  });

  router.delete('/:id', async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).json({ error: `${label} not found` });
    try {
      const r = await Model.deleteOne(own(req, { _id: req.params.id }));
      if (!r.deletedCount) return res.status(404).json({ error: `${label} not found` });
      res.json({ message: 'Deleted' });
    } catch (err) { fail(res, err); }
  });

  return router;
};
