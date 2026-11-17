const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Load = require('../models/Load');
const { searchEmails } = require('../utils/gmail');

const DOCS_DIR = () => process.env.DOCS_PATH ||
  path.join(process.env.HOME, 'Library/CloudStorage/GoogleDrive-sukhrajsekhon39@gmail.com/My Drive/ORC Carriers/Loads');

function checkGmailConfig(res) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    res.status(400).json({ error: 'Gmail not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to .env' });
    return false;
  }
  return true;
}

// POST /api/gmail/preview — serve attachment buffer inline for PDF viewer
router.post('/preview', async (req, res) => {
  try {
    if (!checkGmailConfig(res)) return;
    const { uid, attachmentIndex, query } = req.body;
    const emails = await searchEmails({ query: query || '', days: 365 });
    const email = emails.find(e => e.uid === uid);
    if (!email) return res.status(404).json({ error: 'Email not found' });
    const attachment = email.attachments[attachmentIndex];
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });
    res.setHeader('Content-Type', attachment.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${attachment.filename}"`);
    res.send(attachment.content);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/gmail/search/:loadId
router.post('/search/:loadId', async (req, res) => {
  try {
    if (!checkGmailConfig(res)) return;
    const load = await Load.findById(req.params.loadId).populate('broker');
    if (!load) return res.status(404).json({ error: 'Load not found' });
    const query = req.body.query || load.broker?.name || load.loadNumber || '';
    const days = req.body.days || 90;
    const emails = await searchEmails({ query, days });
    res.json({ emails: emails.map(e => ({ uid: e.uid, subject: e.subject, from: e.from, date: e.date, attachments: e.attachments.map(a => ({ filename: a.filename, contentType: a.contentType, size: a.size })) })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/gmail/search-all
router.post('/search-all', async (req, res) => {
  try {
    if (!checkGmailConfig(res)) return;
    const query = req.body.query || '';
    const days = req.body.days || 30;
    const emails = await searchEmails({ query, days });
    res.json({ emails: emails.map(e => ({ uid: e.uid, subject: e.subject, from: e.from, date: e.date, attachments: e.attachments.map(a => ({ filename: a.filename, contentType: a.contentType, size: a.size })) })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/gmail/import/:loadId
router.post('/import/:loadId', async (req, res) => {
  try {
    const { uid, attachmentIndex, docType, query } = req.body;
    if (uid == null || attachmentIndex == null) return res.status(400).json({ error: 'uid and attachmentIndex required' });
    const load = await Load.findById(req.params.loadId).populate('broker');
    if (!load) return res.status(404).json({ error: 'Load not found' });

    const searchQuery = query || load.broker?.name || load.loadNumber || '';
    const emails = await searchEmails({ query: searchQuery, days: 365 });
    const email = emails.find(e => e.uid === uid);
    if (!email) return res.status(404).json({ error: 'Email not found — try searching again' });
    const attachment = email.attachments[attachmentIndex];
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const brokerName = (load.broker?.name || 'Unknown').replace(/[\/\\:*?"<>|]/g, '').trim();
    const pickupDate = load.pickup?.scheduledTime;
    let dateStr = 'No Date';
    if (pickupDate) {
      const d = new Date(pickupDate);
      dateStr = `${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
    }
    const ext = path.extname(attachment.filename || '.pdf');
    const filename = `${brokerName} ${dateStr} ${docType || 'Other'}${ext}`;
    const dir = DOCS_DIR();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), attachment.content);

    load.documents.push({ name: filename, type: docType || 'Other', filePath: path.join(dir, filename), mimetype: attachment.contentType });
    await load.save();
    const updated = await Load.findById(load._id).populate('driver').populate('truck').populate('trailer').populate('broker');
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;