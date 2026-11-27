const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Load = require('../models/Load');
const { renderInvoice } = require('../utils/invoicePdf');

router.post('/generate/:loadId', async (req, res) => {
  try {
    const load = await Load.findById(req.params.loadId)
      .populate('driver')
      .populate('truck')
      .populate('trailer')
      .populate('broker');

    if (!load) return res.status(404).json({ error: 'Load not found' });

    const companyInfo = req.body.companyInfo || {};

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${load.loadNumber}.pdf"`);

    const doc = new PDFDocument({ size: 'LETTER', margin: 50, autoFirstPage: false });
    doc.pipe(res);
    doc.addPage({ size: 'LETTER', margin: 50 });
    renderInvoice(doc, load, companyInfo);

    doc.end();

    doc.on('end', async () => {
      try {
        load.invoiceGenerated = true;
        load.invoiceDate = new Date();
        if (load.status === 'Delivered') load.status = 'Invoiced';
        await load.save();
      } catch (e) {
        console.error('Error updating load after invoice:', e.message);
      }
    });

  } catch (err) {
    console.error('Invoice error:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

module.exports = router;