const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Load = require('../models/Load');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.DOCS_PATH ||
      path.join(process.env.HOME, 'Library/CloudStorage/GoogleDrive-sukhrajsekhon39@gmail.com/My Drive/ORC Carriers/Loads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Will be renamed after we know the broker/date/type in the route handler
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// GET all loads
router.get('/', async (req, res) => {
  try {
    const { status, driver, startDate, endDate, search } = req.query;
    let query = {};
    if (status) query.status = status;
    if (driver) query.driver = driver;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { loadNumber: { $regex: search, $options: 'i' } },
        { 'pickup.city': { $regex: search, $options: 'i' } },
        { 'delivery.city': { $regex: search, $options: 'i' } },
      ];
    }
    const loads = await Load.find(query)
      .populate('driver', 'name')
      .populate('truck', 'unitNumber')
      .populate('trailer', 'unitNumber')
      .populate('broker', 'name')
      .sort({ createdAt: -1 });
    res.json(loads);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single load
router.get('/:id', async (req, res) => {
  try {
    const load = await Load.findById(req.params.id)
      .populate('driver').populate('truck').populate('trailer').populate('broker');
    if (!load) return res.status(404).json({ error: 'Load not found' });
    res.json(load);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create load
router.post('/', async (req, res) => {
  try {
    const count = await Load.countDocuments();
    const loadNumber = req.body.loadNumber || `TF-${String(count + 1).padStart(5, '0')}`;
    const load = new Load({ ...req.body, loadNumber });
    await load.save();
    const populated = await load.populate(['driver', 'truck', 'trailer', 'broker']);
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT update load
router.put('/:id', async (req, res) => {
  try {
    const load = await Load.findById(req.params.id);
    if (!load) return res.status(404).json({ error: 'Load not found' });
    load.set(req.body);
    await load.save(); // runs validation and recalculates ratePerMile
    const populated = await load.populate(['driver', 'truck', 'trailer', 'broker']);
    res.json(populated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE load
router.delete('/:id', async (req, res) => {
  try {
    const load = await Load.findById(req.params.id);
    if (load?.documents?.length) {
      for (const doc of load.documents) {
        if (doc.filePath) {
          const full = doc.filePath; // already absolute
          if (fs.existsSync(full)) fs.unlinkSync(full);
        }
      }
    }
    await Load.findByIdAndDelete(req.params.id);
    res.json({ message: 'Load deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST upload document
router.post('/:id/documents', upload.single('document'), async (req, res) => {
  try {
    const load = await Load.findById(req.params.id).populate('broker');
    if (!load) return res.status(404).json({ error: 'Load not found' });
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    // Rename file to "Broker Date Type.ext" format
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const brokerName = (load.broker?.name || 'Unknown').replace(/[\/\\:*?"<>|]/g, '').trim();
    const pickupDate = load.pickup?.scheduledTime;
    let dateStr = 'No Date';
    if (pickupDate) {
      const d = new Date(pickupDate);
      dateStr = `${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
    }
    const docType = req.body.type || 'Other';
    const ext = path.extname(req.file.originalname);
    const newFilename = `${brokerName} ${dateStr} ${docType}${ext}`;
    const docsDir = process.env.DOCS_PATH ||
      path.join(process.env.HOME, 'Library/CloudStorage/GoogleDrive-sukhrajsekhon39@gmail.com/My Drive/ORC Carriers/Loads');
    const oldPath = req.file.path;
    const newPath = path.join(docsDir, newFilename);
    fs.renameSync(oldPath, newPath);

    load.documents.push({
      name: newFilename,
      type: docType,
      filePath: newPath,
      mimetype: req.file.mimetype,
    });
    await load.save();
    const updated = await Load.findById(load._id)
      .populate('driver').populate('truck').populate('trailer').populate('broker');
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET preview document (inline, for PDF viewer)
router.get('/:id/documents/:docId/preview', async (req, res) => {
  try {
    const load = await Load.findById(req.params.id);
    if (!load) return res.status(404).json({ error: 'Load not found' });
    const doc = load.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const fullPath = doc.filePath;
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found on disk' });
    res.setHeader('Content-Type', doc.mimetype || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.name}"`);
    fs.createReadStream(fullPath).pipe(res);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET download document
router.get('/:id/documents/:docId/download', async (req, res) => {
  try {
    const load = await Load.findById(req.params.id);
    if (!load) return res.status(404).json({ error: 'Load not found' });
    const doc = load.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const fullPath = doc.filePath; // already absolute
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found on disk' });
    res.setHeader('Content-Type', doc.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.name}"`);
    fs.createReadStream(fullPath).pipe(res);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE document
router.delete('/:id/documents/:docId', async (req, res) => {
  try {
    const load = await Load.findById(req.params.id);
    if (!load) return res.status(404).json({ error: 'Load not found' });
    const doc = load.documents.id(req.params.docId);
    if (doc?.filePath) {
      const full = doc.filePath; // already absolute
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }
    load.documents = load.documents.filter(d => d._id.toString() !== req.params.docId);
    await load.save();
    res.json(load);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
