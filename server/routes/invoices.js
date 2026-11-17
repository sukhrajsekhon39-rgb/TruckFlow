const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Load = require('../models/Load');

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

    const PAGE_WIDTH = 612;
    const PAGE_HEIGHT = 792;
    const MARGIN = 50;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
    const FOOTER_HEIGHT = 44;

    const doc = new PDFDocument({
      margin: MARGIN,
      size: 'LETTER',
      autoFirstPage: false,
    });
    doc.pipe(res);
    doc.addPage({ size: 'LETTER', margin: MARGIN });

    // ── HEADER BANNER ──
    doc.rect(0, 0, PAGE_WIDTH, 110).fill('#0f172a');
    doc.fillColor('#f8fafc').fontSize(24).font('Helvetica-Bold')
      .text(companyInfo.name || 'YOUR COMPANY NAME', MARGIN, 30);
    doc.fontSize(9).font('Helvetica').fillColor('#94a3b8')
      .text(companyInfo.address || '', MARGIN, 62)
      .text([companyInfo.phone, companyInfo.email].filter(Boolean).join('  |  '), MARGIN, 75)
      .text(`MC# ${companyInfo.mc || 'XXXXXX'}  |  DOT# ${companyInfo.dot || 'XXXXXX'}`, MARGIN, 88);
    doc.fillColor('#f97316').fontSize(20).font('Helvetica-Bold')
      .text('INVOICE', 400, 30, { width: 162, align: 'right' });
    doc.fillColor('#94a3b8').fontSize(10).font('Helvetica')
      .text(`# ${load.loadNumber}`, 400, 58, { width: 162, align: 'right' })
      .text(new Date().toLocaleDateString(), 400, 72, { width: 162, align: 'right' });

    // ── BILL TO / LOAD DETAILS ──
    const boxY = 128;
    const boxH = 85;

    doc.rect(MARGIN, boxY, 240, boxH).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('BILL TO', 64, boxY + 10);
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold')
      .text(load.broker?.name || 'Broker Name', 64, boxY + 24);
    doc.fontSize(9).font('Helvetica').fillColor('#475569')
      .text(load.broker?.address || '', 64, boxY + 40)
      .text(load.broker?.email || '', 64, boxY + 54)
      .text(load.broker?.phone || '', 64, boxY + 68);

    doc.rect(322, boxY, 240, boxH).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('LOAD DETAILS', 336, boxY + 10);
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica')
      .text(`Load #:   ${load.loadNumber}`, 336, boxY + 24)
      .text(`Driver:    ${load.driver?.name || 'N/A'}`, 336, boxY + 38)
      .text(`Truck:     ${load.truck?.unitNumber || 'N/A'}`, 336, boxY + 52)
      .text(`Trailer:   ${load.trailer?.unitNumber || 'N/A'}`, 336, boxY + 66);

    // ── ROUTE (dynamic height) ──
    const routeY = boxY + boxH + 18;
    const LABEL_X = MARGIN + 14;
    const LABEL_W = 62;
    const TEXT_X = LABEL_X + LABEL_W;
    const TEXT_W = CONTENT_WIDTH - 14 - LABEL_W;

    const pickupAddr = [load.pickup?.address, load.pickup?.city, load.pickup?.state, load.pickup?.zip].filter(Boolean).join(', ') || 'N/A';
    const pickupTime = load.pickup?.scheduledTime ? new Date(load.pickup.scheduledTime).toLocaleString() : null;
    const deliveryAddr = [load.delivery?.address, load.delivery?.city, load.delivery?.state, load.delivery?.zip].filter(Boolean).join(', ') || 'N/A';
    const deliveryTime = load.delivery?.scheduledTime ? new Date(load.delivery.scheduledTime).toLocaleString() : null;

    const pickupAddrH  = doc.fontSize(9).font('Helvetica').heightOfString(pickupAddr, { width: TEXT_W });
    const pickupTimeH  = pickupTime  ? doc.fontSize(8).font('Helvetica').heightOfString(pickupTime,  { width: TEXT_W }) + 3 : 0;
    const deliveryAddrH = doc.fontSize(9).font('Helvetica').heightOfString(deliveryAddr, { width: TEXT_W });
    const deliveryTimeH = deliveryTime ? doc.fontSize(8).font('Helvetica').heightOfString(deliveryTime, { width: TEXT_W }) + 3 : 0;

    // ROUTE title row: 20px, then pickup block, 10px gap, delivery block, 12px bottom pad
    const routeBoxH = 20 + pickupAddrH + pickupTimeH + 10 + deliveryAddrH + deliveryTimeH + 12;

    doc.rect(MARGIN, routeY, CONTENT_WIDTH, routeBoxH).fillAndStroke('#fafafa', '#e2e8f0');

    // "ROUTE" title on its own row
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold')
      .text('ROUTE', LABEL_X, routeY + 8);

    let ry = routeY + 20; // start content below the ROUTE title

    // Pickup label + address on same baseline
    doc.fillColor('#166534').fontSize(9).font('Helvetica-Bold')
      .text('PICKUP', LABEL_X, ry, { width: LABEL_W });
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica')
      .text(pickupAddr, TEXT_X, ry, { width: TEXT_W });
    ry += pickupAddrH;
    if (pickupTime) {
      doc.fillColor('#64748b').fontSize(8).font('Helvetica')
        .text(pickupTime, TEXT_X, ry + 2, { width: TEXT_W });
      ry += pickupTimeH;
    }

    ry += 10; // gap between pickup and delivery

    // Delivery label + address on same baseline
    doc.fillColor('#9a3412').fontSize(9).font('Helvetica-Bold')
      .text('DELIVERY', LABEL_X, ry, { width: LABEL_W });
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica')
      .text(deliveryAddr, TEXT_X, ry, { width: TEXT_W });
    ry += deliveryAddrH;
    if (deliveryTime) {
      doc.fillColor('#64748b').fontSize(8).font('Helvetica')
        .text(deliveryTime, TEXT_X, ry + 2, { width: TEXT_W });
    }

    // ── LINE ITEMS TABLE ──
    const tableY = routeY + routeBoxH + 18;
    const ROW_H = 32;

    doc.rect(MARGIN, tableY, CONTENT_WIDTH, 24).fill('#0f172a');
    doc.fillColor('#f8fafc').fontSize(9).font('Helvetica-Bold')
      .text('DESCRIPTION', 64, tableY + 8)
      .text('MILES', 340, tableY + 8, { width: 60, align: 'right' })
      .text('RATE/MI', 410, tableY + 8, { width: 60, align: 'right' })
      .text('AMOUNT', 480, tableY + 8, { width: 70, align: 'right' });

    doc.rect(MARGIN, tableY + 24, CONTENT_WIDTH, ROW_H).fillAndStroke('#ffffff', '#e2e8f0');
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica')
      .text(`Freight Transportation${load.commodity ? ' - ' + load.commodity : ''}`, 64, tableY + 34)
      .text((load.miles || 0).toString(), 340, tableY + 34, { width: 60, align: 'right' })
      .text(`$${(load.ratePerMile || 0).toFixed(2)}`, 410, tableY + 34, { width: 60, align: 'right' })
      .text(`$${(load.rate || 0).toFixed(2)}`, 480, tableY + 34, { width: 70, align: 'right' });

    // ── TOTALS ──
    const totalY = tableY + 24 + ROW_H + 16;

    doc.rect(370, totalY, 192, 44).fill('#0f172a');
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('TOTAL DUE', 384, totalY + 8);
    doc.fillColor('#f97316').fontSize(20).font('Helvetica-Bold')
      .text(`$${(load.rate || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 384, totalY + 20);

    doc.fillColor('#64748b').fontSize(9).font('Helvetica')
      .text(`Payment Terms: Net ${load.broker?.paymentTerms || 30} days`, MARGIN, totalY + 10)
      .text(`Please reference Load # ${load.loadNumber} on payment`, MARGIN, totalY + 24);

    // ── FOOTER pinned to bottom of page ──
    const footerY = PAGE_HEIGHT - FOOTER_HEIGHT;
    doc.rect(0, footerY, PAGE_WIDTH, FOOTER_HEIGHT).fill('#0f172a');
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
      .text('Thank you for your business!', MARGIN, footerY + 10, { align: 'center', width: CONTENT_WIDTH })
      .text('Questions? Contact us at the information above.', MARGIN, footerY + 24, { align: 'center', width: CONTENT_WIDTH });

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