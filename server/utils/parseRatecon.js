const pdfParse = require('pdf-parse');

// ── Helpers ────────────────────────────────────────────────────────────

function clean(str) {
  return (str || '').replace(/\s+/g, ' ').trim();
}

function findMoney(text, ...keywords) {
  for (const kw of keywords) {
    const re = new RegExp(kw + '[^\\d$]*\\$?([\\d,]+(?:\\.\\d{1,2})?)', 'i');
    const m = text.match(re);
    if (m) return parseFloat(m[1].replace(/,/g, ''));
  }
  // Fallback: find largest dollar amount in text (likely the rate)
  const all = [...text.matchAll(/\$\s*([\d,]+(?:\.\d{1,2})?)/g)];
  if (all.length) {
    const amounts = all.map(m => parseFloat(m[1].replace(/,/g, ''))).filter(n => n > 100);
    if (amounts.length) return Math.max(...amounts);
  }
  return null;
}

function findMiles(text) {
  const patterns = [
    /total\s+miles?[:\s]+([0-9,]+)/i,
    /([0-9,]+)\s*miles?/i,
    /miles?[:\s]+([0-9,]+)/i,
    /distance[:\s]+([0-9,]+)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const val = parseInt(m[1].replace(/,/g, ''));
      if (val > 10 && val < 10000) return val;
    }
  }
  return null;
}

function findWeight(text) {
  const m = text.match(/([0-9,]+)\s*(?:lbs?|pounds?|cwt)/i);
  if (m) return parseInt(m[1].replace(/,/g, ''));
  return null;
}

function findCommodity(text) {
  const patterns = [
    /commodity[:\s]+([^\n]+)/i,
    /product[:\s]+([^\n]+)/i,
    /description[:\s]+([^\n]+)/i,
    /freight[:\s]+([^\n]+)/i,
    /cargo[:\s]+([^\n]+)/i,
    /load\s+(?:type|description)[:\s]+([^\n]+)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const val = clean(m[1]).replace(/[^\w\s\-\/]/g, '').trim();
      if (val.length > 1 && val.length < 80) return val;
    }
  }
  return null;
}

// Parse address block into components
function parseAddress(block) {
  if (!block) return {};
  const lines = block.split(/\n|,/).map(s => s.trim()).filter(Boolean);

  // Try to find state + zip on last line
  let address = '', city = '', state = '', zip = '';

  // Look for "City, ST 12345" or "City ST 12345" pattern
  const cityStateZip = block.match(/([A-Za-z\s]+),?\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
  if (cityStateZip) {
    city = clean(cityStateZip[1]);
    state = cityStateZip[2];
    zip = cityStateZip[3];
    // Everything before city/state/zip is the street address
    const idx = block.indexOf(cityStateZip[0]);
    address = clean(block.substring(0, idx));
  } else {
    // Fallback: first line is address, try to parse rest
    address = lines[0] || '';
    const stateZip = block.match(/\b([A-Z]{2})\s+(\d{5})\b/);
    if (stateZip) { state = stateZip[1]; zip = stateZip[2]; }
    if (lines[1]) city = lines[1].replace(/,.*/, '').trim();
  }

  return { address: clean(address), city: clean(city), state: state.toUpperCase(), zip };
}

function findDate(text, ...keywords) {
  for (const kw of keywords) {
    // Look for keyword followed by date patterns
    const re = new RegExp(kw + '[^\\n]{0,30}?(' +
      '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{1,2},?\\s+\\d{4}' +
      '|\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4}' +
      '|\\d{4}-\\d{2}-\\d{2}' +
      ')', 'i');
    const m = text.match(re);
    if (m) {
      const d = new Date(m[1]);
      if (!isNaN(d)) return d.toISOString();
    }
  }
  // Try to find any date near the keyword in surrounding lines
  for (const kw of keywords) {
    const kwIdx = text.toLowerCase().indexOf(kw.toLowerCase());
    if (kwIdx === -1) continue;
    const snippet = text.substring(kwIdx, kwIdx + 200);
    const dateRe = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
    const m = snippet.match(dateRe);
    if (m) {
      const d = new Date(m[1]);
      if (!isNaN(d) && d.getFullYear() >= 2020) return d.toISOString();
    }
  }
  return null;
}

// Find address block near a keyword
function findAddressBlock(text, ...keywords) {
  for (const kw of keywords) {
    const re = new RegExp(kw + '[:\\s]*([\\s\\S]{10,200}?)(?=\\n\\n|pickup|delivery|origin|destination|shipper|consignee|load|rate|$)', 'i');
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

function findBroker(text) {
  // Look for MC#, authority, company name patterns
  const patterns = [
    /broker[:\s]+([^\n]+)/i,
    /arranged\s+by[:\s]+([^\n]+)/i,
    /carrier\s+contact[:\s]+([^\n]+)/i,
    /(?:from|bill\s+to)[:\s]+([^\n]+)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const val = clean(m[1]);
      if (val.length > 2 && val.length < 60) return val;
    }
  }
  // First non-empty line is often the broker company name
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3 && l.length < 60);
  return lines[0] || null;
}

function findMC(text) {
  const m = text.match(/MC\s*#?\s*(\d{5,7})/i);
  return m ? m[1] : null;
}

function findPhone(text, ...keywords) {
  for (const kw of keywords) {
    const re = new RegExp(kw + '[^\\n]{0,50}?(' +
      '\\(?\\d{3}\\)?[\\s.\\-]?\\d{3}[\\s.\\-]?\\d{4}' +
      ')', 'i');
    const m = text.match(re);
    if (m) return m[1].replace(/[^0-9]/g, '').replace(/^1/, '');
  }
  const m = text.match(/\(?(\d{3})\)?[\s.\-]?(\d{3})[\s.\-]?(\d{4})/);
  return m ? `${m[1]}${m[2]}${m[3]}` : null;
}

function findEmail(text) {
  const m = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  return m ? m[0] : null;
}

// ── Main parser ────────────────────────────────────────────────────────

async function parseRatecon(buffer) {
  let text = '';

  try {
    const data = await pdfParse(buffer);
    text = data.text;
  } catch (e) {
    throw new Error('Could not read PDF: ' + e.message);
  }

  console.log('[Ratecon] Extracted text length:', text.length);
  console.log('[Ratecon] First 500 chars:\n', text.substring(0, 500));

  // ── Extract fields ──
  const rate = findMoney(text, 'total', 'rate', 'amount', 'pay', 'linehaul', 'line haul', 'flat rate');
  const miles = findMiles(text);
  const weight = findWeight(text);
  const commodity = findCommodity(text);
  const brokerName = findBroker(text);
  const brokerMC = findMC(text);
  const brokerPhone = findPhone(text, 'contact', 'phone', 'call', 'broker', 'dispatch');
  const brokerEmail = findEmail(text);

  // Pickup
  const pickupBlock = findAddressBlock(text, 'pickup', 'origin', 'ship from', 'shipper', 'pu');
  const pickup = parseAddress(pickupBlock || '');
  const pickupDate = findDate(text, 'pickup', 'pu date', 'ship date', 'pickup date', 'origin date');

  // Delivery
  const deliveryBlock = findAddressBlock(text, 'delivery', 'destination', 'deliver to', 'consignee', 'del');
  const delivery = parseAddress(deliveryBlock || '');
  const deliveryDate = findDate(text, 'delivery', 'del date', 'deliver by', 'delivery date', 'destination date');

  // Notes: look for special instructions
  const notesMatch = text.match(/(?:special\s+instructions?|notes?|comments?|requirements?)[:\s]+([^\n]{5,200})/i);
  const notes = notesMatch ? clean(notesMatch[1]) : null;

  return {
    brokerName,
    brokerPhone,
    brokerEmail,
    brokerMC,
    rate,
    miles,
    commodity,
    weight,
    pickupAddress: pickup.address || null,
    pickupCity: pickup.city || null,
    pickupState: pickup.state || null,
    pickupZip: pickup.zip || null,
    pickupDate,
    deliveryAddress: delivery.address || null,
    deliveryCity: delivery.city || null,
    deliveryState: delivery.state || null,
    deliveryZip: delivery.zip || null,
    deliveryDate,
    notes,
    _rawText: text.substring(0, 2000), // send first 2000 chars for debugging
  };
}

module.exports = { parseRatecon };