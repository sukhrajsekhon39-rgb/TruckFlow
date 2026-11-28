const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Load = require('../models/Load');
const Company = require('../models/Company');
const { isId, serverError } = require('../utils/security');
const { renderInvoice } = require('../utils/invoicePdf');

router.post('/generate/:loadId', async (req, res) => {
  try {
    if (!isId(req.params.loadId)) return res.status(404).json({ error: 'Load not found' });
    const load = await Load.findOne({ _id: req.params.loadId, company: req.companyId })
      .populate('driver')
      .populate('truck')
      .populate('trailer')
      .populate('broker');

    if (!load) return res.status(404).json({ error: 'Load not found' });

    // The invoice header always comes from the signed-in company's own profile
    const companyInfo = (await Company.findById(req.companyId).lean()) || {};

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
    if (!res.headersSent) serverError(res, err);
  }
});

module.exports = router;