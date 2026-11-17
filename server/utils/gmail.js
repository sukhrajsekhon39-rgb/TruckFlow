const Imap = require('imap');
const { simpleParser } = require('mailparser');

function createImapConnection() {
  return new Imap({
    user: process.env.GMAIL_USER,
    password: process.env.GMAIL_APP_PASSWORD,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 10000,
  });
}

// Search Gmail with a free-text query, subject, body, sender, date range
function searchEmails({ query, days = 90 }) {
  return new Promise((resolve, reject) => {
    const imap = createImapConnection();
    const results = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err) => {
        if (err) { imap.end(); return reject(err); }

        const since = new Date();
        since.setDate(since.getDate() - days);

        // Build criteria: date range + search term in subject OR body OR from
        let criteria = [['SINCE', since]];
        if (query && query.trim()) {
          const q = query.trim();
          criteria = [
            ...criteria,
            ['OR',
              ['OR',
                ['SUBJECT', q],
                ['BODY', q]
              ],
              ['FROM', q]
            ]
          ];
        }

        imap.search(criteria, (err, uids) => {
          if (err || !uids || !uids.length) {
            imap.end();
            return resolve([]);
          }

          // Most recent 60
          const limited = uids.slice(-60);
          const fetch = imap.fetch(limited, { bodies: '', struct: true });
          const emails = [];
          let pending = limited.length;

          fetch.on('message', (msg) => {
            let buffer = '';
            let uid = null;
            msg.on('attributes', attrs => { uid = attrs.uid; });
            msg.on('body', stream => {
              stream.on('data', chunk => { buffer += chunk.toString('utf8'); });
            });
            msg.once('end', () => {
              emails.push({ uid, raw: buffer });
              pending--;
              if (pending === 0) imap.end();
            });
          });

          fetch.once('error', err => { imap.end(); reject(err); });

          imap.once('end', async () => {
            for (const email of emails) {
              try {
                const parsed = await simpleParser(email.raw);
                const attachments = (parsed.attachments || []).filter(a =>
                  a.size > 0 && (
                    a.contentType?.includes('pdf') ||
                    a.contentType?.includes('image') ||
                    a.contentType?.includes('msword') ||
                    a.contentType?.includes('officedocument')
                  )
                );
                if (attachments.length > 0) {
                  results.push({
                    uid: email.uid,
                    subject: parsed.subject || '(no subject)',
                    from: parsed.from?.text || '',
                    date: parsed.date,
                    attachments: attachments.map(a => ({
                      filename: a.filename || 'attachment',
                      contentType: a.contentType,
                      size: a.size,
                      content: a.content,
                    })),
                  });
                }
              } catch (e) {
                console.warn('Failed to parse email:', e.message);
              }
            }
            // Sort newest first
            results.sort((a, b) => new Date(b.date) - new Date(a.date));
            resolve(results);
          });
        });
      });
    });

    imap.once('error', err => reject(err));
    imap.connect();
  });
}

module.exports = { searchEmails };