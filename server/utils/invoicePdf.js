// Renders a load invoice into a PDFKit document.
// Styled to match the TruckFlow web app: obsidian bands, champagne-gold
// accents, serif display type, hairline rules on a clean white page.

const C = {
  obsidian: '#0A0A0B',
  ink:      '#111113',
  body:     '#3A3936',
  muted:    '#6B6A66',
  faint:    '#A9A69F',
  hairline: '#E6E2DA',
  paper:    '#FAF8F4',
  gold:     '#C9A86C',
  goldDeep: '#8A6A32',
  white:    '#FFFFFF',
};

const PAGE_W = 612;
const PAGE_H = 792;
const M = 50;                 // side margin
const W = PAGE_W - M * 2;     // content width
const FOOTER_H = 56;

const money = n => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtDateTime = d => new Date(d).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

// Small caps-style label: tiny, bold, letter-spaced
function label(doc, text, x, y, opts = {}) {
  doc.font('Helvetica-Bold').fontSize(7).fillColor(opts.color || C.goldDeep)
    .text(text.toUpperCase(), x, y, { characterSpacing: 1.6, lineBreak: false, ...opts });
}

function rule(doc, x1, y, x2, color = C.hairline, width = 0.75) {
  doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(width).strokeColor(color).stroke().restore();
}

// Gold rounded-square logo mark with a lightning bolt, as in the app
function logoMark(doc, x, y, size = 34) {
  doc.save();
  doc.roundedRect(x, y, size, size, size * 0.26).fill(C.gold);
  const s = size / 24; // bolt path is drawn on a 24-unit grid
  doc.translate(x, y).scale(s)
    .moveTo(13.2, 4).lineTo(6.2, 13.4).lineTo(11.4, 13.4).lineTo(10.6, 20)
    .lineTo(17.8, 10.6).lineTo(12.6, 10.6).closePath().fill(C.obsidian);
  doc.restore();
}

function renderInvoice(doc, load, companyInfo = {}) {
  const ratePerMile = load.ratePerMile || (load.rate > 0 && load.miles > 0 ? load.rate / load.miles : 0);

  // ── HEADER BAND ─────────────────────────────────────────
  const HEADER_H = 132;
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(C.obsidian);
  doc.rect(0, HEADER_H, PAGE_W, 1.5).fill(C.gold);

  logoMark(doc, M, 34);
  doc.font('Times-Roman').fontSize(24).fillColor(C.white)
    .text(companyInfo.name || 'Your Company Name', M + 48, 36, { width: 300, lineBreak: false, ellipsis: true });

  const contact = [
    companyInfo.address,
    [companyInfo.phone, companyInfo.email].filter(Boolean).join('   ·   '),
    [companyInfo.mc && `MC# ${companyInfo.mc}`, companyInfo.dot && `DOT# ${companyInfo.dot}`].filter(Boolean).join('   ·   '),
  ].filter(Boolean);
  doc.font('Helvetica').fontSize(8.5).fillColor(C.faint);
  contact.forEach((line, i) => doc.text(line, M + 48, 66 + i * 13, { width: 300, lineBreak: false, ellipsis: true }));

  // Right side: INVOICE / number / date
  const RX = 352, RW = PAGE_W - M - RX;
  label(doc, 'Invoice', RX, 38, { width: RW, align: 'right', color: C.gold });
  doc.font('Times-Roman').fontSize(26).fillColor(C.white)
    .text(load.loadNumber || '', RX, 52, { width: RW, align: 'right', lineBreak: false });
  doc.font('Helvetica').fontSize(8.5).fillColor(C.faint)
    .text(`Issued ${fmtDate(new Date())}`, RX, 88, { width: RW, align: 'right', lineBreak: false });

  // ── BILL TO / LOAD DETAILS ──────────────────────────────
  let y = HEADER_H + 34;
  const COL_W = (W - 32) / 2;
  const RCOL = M + COL_W + 32;

  label(doc, 'Bill to', M, y);
  label(doc, 'Load details', RCOL, y);
  rule(doc, M, y + 13, M + COL_W);
  rule(doc, RCOL, y + 13, PAGE_W - M);

  // Bill to
  doc.font('Times-Roman').fontSize(16).fillColor(C.ink)
    .text(load.broker?.name || 'Broker', M, y + 24, { width: COL_W });
  let by = doc.y + 4;
  doc.font('Helvetica').fontSize(9).fillColor(C.body);
  [load.broker?.address, load.broker?.email, load.broker?.phone].filter(Boolean).forEach(line => {
    doc.text(line, M, by, { width: COL_W });
    by = doc.y + 2;
  });

  // Load details as label / value rows
  const details = [
    ['Load #', load.loadNumber],
    ['Driver', load.driver?.name],
    ['Truck', load.truck?.unitNumber],
    ['Trailer', load.trailer?.unitNumber],
  ];
  let dy = y + 26;
  details.forEach(([k, v]) => {
    doc.font('Helvetica').fontSize(9).fillColor(C.muted).text(k, RCOL, dy, { width: 70, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink)
      .text(v || '—', RCOL + 70, dy, { width: COL_W - 70, align: 'right', lineBreak: false, ellipsis: true });
    dy += 17;
  });

  y = Math.max(by, dy) + 26;

  // ── ROUTE ───────────────────────────────────────────────
  label(doc, 'Route', M, y);
  rule(doc, M, y + 13, PAGE_W - M);
  y += 28;

  const STOP_X = M + 22, STOP_W = W - 22;
  const stop = (kind, s, dotColor, isLast) => {
    const addr = [s?.address, s?.city, s?.state, s?.zip].filter(Boolean).join(', ') || '—';
    const time = s?.scheduledTime ? fmtDateTime(s.scheduledTime) : null;
    const top = y;
    doc.circle(M + 5, top + 5, 3.5).fill(dotColor);
    label(doc, kind, STOP_X, top, { color: C.muted });
    doc.font('Helvetica').fontSize(10).fillColor(C.ink).text(addr, STOP_X, top + 12, { width: STOP_W });
    let bottom = doc.y;
    if (time) {
      doc.font('Helvetica').fontSize(8.5).fillColor(C.muted).text(time, STOP_X, bottom + 2, { width: STOP_W });
      bottom = doc.y;
    }
    y = bottom + 14;
    if (!isLast) {
      // connector line between the two stops
      doc.save().moveTo(M + 5, top + 12).lineTo(M + 5, y + 1).lineWidth(0.75).dash(1.5, { space: 2.5 }).strokeColor(C.faint).stroke().undash().restore();
    }
  };
  stop('Pickup', load.pickup, C.ink, false);
  stop('Delivery', load.delivery, C.gold, true);

  y += 8;

  // ── LINE ITEMS ──────────────────────────────────────────
  const cols = [
    { key: 'desc',   title: 'Description', x: M,       w: 250, align: 'left'  },
    { key: 'miles',  title: 'Miles',       x: M + 262, w: 70,  align: 'right' },
    { key: 'rpm',    title: 'Rate / mi',   x: M + 340, w: 70,  align: 'right' },
    { key: 'amount', title: 'Amount',      x: M + 418, w: W - 418, align: 'right' },
  ];
  rule(doc, M, y, PAGE_W - M, C.ink, 1);
  cols.forEach(c => label(doc, c.title, c.x, y + 9, { width: c.w, align: c.align, color: C.muted }));
  rule(doc, M, y + 24, PAGE_W - M);

  const rowY = y + 36;
  const row = {
    desc: `Freight transportation${load.commodity ? ` — ${load.commodity}` : ''}`,
    miles: (load.miles || 0).toLocaleString('en-US'),
    rpm: money(ratePerMile),
    amount: money(load.rate),
  };
  cols.forEach(c => {
    doc.font(c.key === 'amount' ? 'Helvetica-Bold' : 'Helvetica').fontSize(10)
      .fillColor(c.key === 'desc' || c.key === 'amount' ? C.ink : C.body)
      .text(row[c.key], c.x, rowY, { width: c.w, align: c.align });
  });
  y = Math.max(doc.y, rowY + 14) + 12;
  rule(doc, M, y, PAGE_W - M);

  // ── TOTAL ───────────────────────────────────────────────
  y += 22;
  const TW = 220, TX = PAGE_W - M - TW, TH = 70;
  doc.roundedRect(TX, y, TW, TH, 10).fill(C.obsidian);
  label(doc, 'Total due', TX + 20, y + 16, { color: C.gold });
  doc.font('Times-Roman').fontSize(28).fillColor(C.white)
    .text(money(load.rate), TX + 20, y + 30, { width: TW - 40, align: 'left', lineBreak: false });

  doc.font('Helvetica').fontSize(9).fillColor(C.muted)
    .text(`Please reference Load # ${load.loadNumber} with your payment.`, M, y + 30, { width: TX - M - 24 });

  // ── FOOTER BAND (pinned to the bottom of page 1) ────────
  // Drop the bottom margin so text near the page edge never spills onto a new page.
  doc.page.margins.bottom = 0;
  const FY = PAGE_H - FOOTER_H;
  doc.rect(0, FY - 1.5, PAGE_W, 1.5).fill(C.gold);
  doc.rect(0, FY, PAGE_W, FOOTER_H).fill(C.obsidian);
  doc.font('Times-Italic').fontSize(14).fillColor(C.white)
    .text('Thank you for your business.', M, FY + 14, { width: W, align: 'center', lineBreak: false });
  doc.font('Helvetica').fontSize(8).fillColor(C.faint)
    .text('Questions? Contact us using the details above.', M, FY + 34, { width: W, align: 'center', lineBreak: false });
}

module.exports = { renderInvoice };
