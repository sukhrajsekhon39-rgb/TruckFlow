// One-time move from the old single-login TruckFlow to company accounts.
//
// Before this change, records had no owner. This attaches every record that has no
// company yet to the company of the account you name.
//
//   1. Start the app and create your account on the sign-up page.
//   2. cd server && node scripts/claim-existing-data.js you@yourcompany.com
//
// Add --dry-run to only print what would change.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');

const email = (process.argv[2] || '').trim().toLowerCase();
const dryRun = process.argv.includes('--dry-run');

(async () => {
  if (!email || email.startsWith('--')) {
    console.log('Usage: node scripts/claim-existing-data.js you@yourcompany.com [--dry-run]');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/truckflow');
  const user = await User.findOne({ email });
  if (!user) { console.error(`No account found for ${email}. Sign up in the app first.`); process.exit(1); }
  const company = await Company.findById(user.company);
  console.log(`Attaching unowned records to "${company.name}" (${email})${dryRun ? ' — dry run' : ''}\n`);

  const unowned = { $or: [{ company: { $exists: false } }, { company: null }] };
  for (const name of ['Driver', 'Truck', 'Trailer', 'Broker', 'Load']) {
    const coll = mongoose.connection.collection(`${name.toLowerCase()}s`);
    const count = await coll.countDocuments(unowned);
    if (!dryRun && count) await coll.updateMany(unowned, { $set: { company: company._id } });
    console.log(`${name.padEnd(8)} ${count}`);
  }

  // Continue automatic load numbers after the highest existing TF-##### number
  const loads = await mongoose.connection.collection('loads')
    .find({ $and: [{ $or: [{ company: company._id }, unowned] }, { loadNumber: /^TF-\d+$/ }] }, { projection: { loadNumber: 1 } }).toArray();
  const max = loads.reduce((m, l) => Math.max(m, parseInt(l.loadNumber.slice(3), 10) || 0), 0);
  if (!dryRun && max > (company.loadSeq || 0)) await Company.updateOne({ _id: company._id }, { $set: { loadSeq: max } });
  console.log(`\nNext automatic load number: TF-${String(Math.max(max, company.loadSeq || 0) + 1).padStart(5, '0')}`);

  await mongoose.disconnect();
  console.log(dryRun ? '\nDry run only; nothing changed.' : '\nDone.');
})().catch(err => { console.error(err); process.exit(1); });
