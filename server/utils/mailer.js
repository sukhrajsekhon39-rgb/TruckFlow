const nodemailer = require('nodemailer');
const { IS_PROD } = require('./security');

// Uses SMTP_* settings if present, otherwise Gmail (GMAIL_USER + GMAIL_APP_PASSWORD).
function transport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return null;
}

const FROM = () => process.env.MAIL_FROM || `TruckFlow <${process.env.SMTP_USER || process.env.GMAIL_USER || 'no-reply@localhost'}>`;

async function sendMail({ to, subject, text, html }) {
  const t = transport();
  if (!t) {
    if (!IS_PROD) console.log(`\n[mail not configured] To: ${to}\nSubject: ${subject}\n${text}\n`);
    else console.warn('Email is not configured (set SMTP_* or GMAIL_* in .env); message not sent.');
    return;
  }
  await t.sendMail({ from: FROM(), to, subject, text, html });
}

function appUrl() {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

module.exports = { sendMail, appUrl };
