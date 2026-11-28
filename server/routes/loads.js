const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Load = require('../models/Load');
const Company = require('../models/Company');
const Driver = require('../models/Driver');
const Truck = require('../models/Truck');
const Trailer = require('../models/Trailer');
const Broker = require('../models/Broker');
const { cleanBody, isId, escapeRegex, serverError } = require('../utils/security');

const router = express.Router();
const STATUSES = ['Pending', 'In Transit', 'Delivered', 'Invoiced', 'Paid'];
const DOC_TYPES = ['BOL', 'Ratecon', 'Lumper Receipt', 'Detention', 'Other'];
const POPULATE = ['driver', 'truck', 'trailer', 'broker'];

// ── Document storage: one folder per company, outside any public path ──
// DOCS_PATH can point somewhere else (for example a synced drive); each company gets a subfolder in it.
const DOCS_ROOT = process.env.DOCS_PATH || path.join(__dirname, '..', 'uploads', 'documents');
const companyDir = companyId => path.join(DOCS_ROOT, String(companyId));
const ALLOWED = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(DOCS_ROOT, '.incoming');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, crypto.randomUUID()),
  }),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const ok = ALLOWED[file.mimetype]?.includes(ext);
    cb(ok ? null : Object.assign(new Error('Upload a PDF or an image (JPG, PNG, WEBP, HEIC).'), { status: 400 }), ok);
  },
});

const own = (req, extra = {}) => ({ ...extra, company: req.companyId });

// Linked driver/truck/trailer/broker must belong to the same company
async function checkRefs(req, body) {
  const refs = [['driver', Driver], ['truck', Truck], ['trailer', Trailer], ['broker', Broker]];
  for (const [key, Model] of refs) {
    if (!(key in body)) continue;
    if (body[key] === '' || body[key] === null) { body[key] = null; continue; }
    if (!isId(body[key]) || !(await Model.exists({ _id: body[key], company: req.companyId }))) {
      const e = new Error(`That ${key} wasn’t found in your company.`); e.status = 400; throw e;
    }
  }
}

// Load fields a client may set (documents and invoice flags are server-managed)
const loadBody = body => cleanBody(body, ['documents', 'ratePerMile']);

async function nextLoadNumber(companyId) {
  for (let i = 0; i < 20; i++) {
    const c = await Company.findByIdAndUpdate(companyId, { $inc: { loadSeq: 1 } }, { new: true });
    const num = `TF-${String(c.loadSeq).padStart(5, '0')}`;
    if (!(await Load.exists({ company: companyId, loadNumber: num }))) return num;
  }
  return `TF-${Date.now()}`;
}

function fail(res, err) {
  if (err?.status) return res.status(err.status).json({ error: err.message });
  if (err?.code === 11000) return res.status(409).json({ error: 'Another load already uses that load number.' });
  if (err?.name === 'ValidationError' || err?.name === 'CastError') return res.status(400).json({ error: err.message });
  serverError(res, err);
}

async function findOwnLoad(req, res) {
  if (!isId(req.params.id)) { res.status(404).json({ error: 'Load not found' }); return null; }
  const load = await Load.findOne(own(req, { _id: req.params.id }));
  if (!load) res.status(404).json({ error: 'Load not found' });
  return load;
}

// GET all loads
router.get('/', async (req, res) => {
  try {
    const { status, driver, startDate, endDate, search } = req.query;
    const query = own(req);
    if (status) { if (!STATUSES.includes(String(status))) return res.status(400).json({ error: 'Invalid status' }); query.status = String(status); }
    if (driver) { if (!isId(driver)) return res.status(400).json({ error: 'Invalid driver' }); query.driver = String(driver); }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(String(startDate));
      if (endDate) query.createdAt.$lte = new Date(String(endDate));
    }
    if (search) {
      const rx = { $regex: escapeRegex(String(search).slice(0, 100)), $options: 'i' };
      query.$or = [{ loadNumber: rx }, { 'pickup.city': rx }, { 'delivery.city': rx }];
    }
    const loads = await Load.find(query)
      .populate('driver', 'name')
      .populate('truck', 'unitNumber')
      .populate('trailer', 'unitNumber')
      .populate('broker', 'name')
      .sort({ createdAt: -1 });
    res.json(loads);
  } catch (err) { fail(res, err); }
});

// GET single load
router.get('/:id', async (req, res) => {
  try {
    const load = await findOwnLoad(req, res);
    if (!load) return;
    res.json(await load.populate(POPULATE));
  } catch (err) { fail(res, err); }
});

// POST create load
router.post('/', async (req, res) => {
  try {
    const body = loadBody(req.body);
    await checkRefs(req, body);
    const loadNumber = String(body.loadNumber || '').trim() || await nextLoadNumber(req.companyId);
    const load = new Load({ ...body, loadNumber, company: req.companyId });
    await load.save();
    res.status(201).json(await load.populate(POPULATE));
  } catch (err) { fail(res, err); }
});

// PUT update load
router.put('/:id', async (req, res) => {
  try {
    const load = await findOwnLoad(req, res);
    if (!load) return;
    const body = loadBody(req.body);
    await checkRefs(req, body);
    load.set(body);
    await load.save(); // runs validation and recalculates ratePerMile
    res.json(await load.populate(POPULATE));
  } catch (err) { fail(res, err); }
});

// DELETE load
router.delete('/:id', async (req, res) => {
  try {
    const load = await findOwnLoad(req, res);
    if (!load) return;
    for (const doc of load.documents || []) {
      if (doc.filePath) await fs.promises.unlink(doc.filePath).catch(() => {});
    }
    await Load.deleteOne({ _id: load._id, company: req.companyId });
    res.json({ message: 'Load deleted' });
  } catch (err) { fail(res, err); }
});

// POST upload document
router.post('/:id/documents', (req, res, next) => {
  upload.single('document')(req, res, err => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Files can be up to 20 MB.' : err.message });
    next();
  });
}, async (req, res) => {
  const tmp = req.file?.path;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const load = await findOwnLoad(req, res);
    if (!load) { fs.promises.unlink(tmp).catch(() => {}); return; }
    await load.populate('broker');

    // Readable name: "Broker Mon D YYYY Type.ext"
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const brokerName = safeName(load.broker?.name || 'Unknown');
    const d = load.pickup?.scheduledTime ? new Date(load.pickup.scheduledTime) : null;
    const dateStr = d ? `${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}` : 'No Date';
    const docType = DOC_TYPES.includes(req.body.type) ? req.body.type : 'Other';
    const ext = path.extname(req.file.originalname).toLowerCase();
    const base = `${brokerName} ${dateStr} ${docType}`;

    const dir = companyDir(req.companyId);
    await fs.promises.mkdir(dir, { recursive: true });
    let name = `${base}${ext}`;
    for (let n = 2; fs.existsSync(path.join(dir, name)); n++) name = `${base} (${n})${ext}`;
    const finalPath = path.join(dir, name);
    await fs.promises.rename(tmp, finalPath);

    load.documents.push({ name, type: docType, filePath: finalPath, mimetype: req.file.mimetype });
    await load.save();
    res.json(await load.populate(['driver', 'truck', 'trailer']));
  } catch (err) {
    if (tmp) fs.promises.unlink(tmp).catch(() => {});
    fail(res, err);
  }
});

async function sendDoc(req, res, disposition) {
  try {
    const load = await findOwnLoad(req, res);
    if (!load) return;
    const doc = isId(req.params.docId) && load.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!doc.filePath || !fs.existsSync(doc.filePath)) return res.status(404).json({ error: 'File not found' });
    const ascii = doc.name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '');
    res.setHeader('Content-Type', doc.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(doc.name)}`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    fs.createReadStream(doc.filePath).pipe(res);
  } catch (err) { fail(res, err); }
}

// GET preview (inline) / download (attachment)
router.get('/:id/documents/:docId/preview', (req, res) => sendDoc(req, res, 'inline'));
router.get('/:id/documents/:docId/download', (req, res) => sendDoc(req, res, 'attachment'));

// DELETE document
router.delete('/:id/documents/:docId', async (req, res) => {
  try {
    const load = await findOwnLoad(req, res);
    if (!load) return;
    const doc = isId(req.params.docId) && load.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.filePath) await fs.promises.unlink(doc.filePath).catch(() => {});
    load.documents.pull(doc._id);
    await load.save();
    res.json(load);
  } catch (err) { fail(res, err); }
});

function safeName(s) {
  return String(s).replace(/[/\\:*?"<>|\x00-\x1F]/g, '').replace(/\.+$/, '').trim().slice(0, 80) || 'Unknown';
}

module.exports = router;
