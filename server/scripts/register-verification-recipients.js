/**
 * register-verification-recipients.js
 *
 * Scans Gmail Sent folder for emails with subject "Your Verification Code",
 * extracts recipient email addresses, compares with existing DB users,
 * and registers any missing emails as new users with role "user".
 *
 * Usage:
 *   DRY RUN (default):  node -r dotenv/config scripts/register-verification-recipients.js
 *   APPLY:              node -r dotenv/config scripts/register-verification-recipients.js --apply
 */

const path = require('path');
const tls = require('tls');
const { MongoClient } = require('mongodb');
const argon2 = require('argon2');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const APPLY = process.argv.includes('--apply');
const DEFAULT_PASSWORD = '123456';

function sanitizeMongoUri(uri) {
  return String(uri || '')
    .replace(/appName(?=&|$)/g, 'appName=SoulArt')
    .replace(/appName=&/g, 'appName=SoulArt&')
    .replace(/\?&/, '?')
    .replace(/&&/g, '&');
}

const MONGODB_URI = sanitizeMongoUri(process.env.MONGODB_URI || process.env.DATABASE_URL);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function extractEmails(text) {
  const matches = String(text || '').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
  return matches ? [...new Set(matches.map(normalizeEmail))] : [];
}

function isSystemEmail(email) {
  const value = normalizeEmail(email);
  const localPart = value.split('@')[0];
  return (
    !value ||
    value.includes('example.com') ||
    value.includes('example.ge') ||
    value.includes('gserviceaccount.com') ||
    value.includes('your-project') ||
    value.includes('analytics') ||
    value.includes('cluster0') ||
    value.includes('mongodb.net') ||
    value.includes('noreply') ||
    value.includes('no-reply') ||
    value === normalizeEmail(EMAIL_USER) ||
    /^test\d*$/.test(localPart) ||
    /^testuser/.test(localPart) ||
    /^testani/.test(localPart) ||
    /^testtedt/.test(localPart) ||
    /^user$/.test(localPart) ||
    /^salesmanagerr?$/.test(localPart)
  );
}

function decodeMimeWords(input) {
  if (!input) return '';
  return input.replace(/=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g, (_, charset, encoding, text) => {
    try {
      let buf;
      if (encoding.toUpperCase() === 'B') buf = Buffer.from(text, 'base64');
      else {
        const qp = text.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)));
        buf = Buffer.from(qp, 'binary');
      }
      if (/utf-8/i.test(charset)) return buf.toString('utf8');
      return buf.toString();
    } catch {
      return text;
    }
  });
}

// ─── IMAP Client ───
class ImapClient {
  constructor() {
    this.tagCounter = 1;
    this.pending = new Map();
    this.buffer = '';
    this.socket = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = tls.connect(993, 'imap.gmail.com', { servername: 'imap.gmail.com' }, () => {});
      this.socket.setEncoding('utf8');
      this.socket.on('data', (chunk) => this.onData(chunk, resolve));
      this.socket.on('error', reject);
    });
  }

  onData(chunk, connectResolve) {
    this.buffer += chunk;
    if (connectResolve && this.buffer.includes('\r\n')) {
      const lineEnd = this.buffer.indexOf('\r\n');
      const firstLine = this.buffer.slice(0, lineEnd);
      if (firstLine.startsWith('* OK')) {
        this.buffer = this.buffer.slice(lineEnd + 2);
        connectResolve();
      }
    }
    this.flushPending();
  }

  flushPending() {
    for (const [tag, pending] of [...this.pending.entries()]) {
      const idx = [
        this.buffer.indexOf(`\r\n${tag} OK`),
        this.buffer.indexOf(`\r\n${tag} NO`),
        this.buffer.indexOf(`\r\n${tag} BAD`),
      ].filter((n) => n >= 0).sort((a, b) => a - b)[0];
      if (idx == null) continue;
      const lineEnd = this.buffer.indexOf('\r\n', idx + 2);
      if (lineEnd < 0) continue;
      const payload = this.buffer.slice(0, lineEnd + 2);
      this.buffer = this.buffer.slice(lineEnd + 2);
      this.pending.delete(tag);
      if (payload.includes(`${tag} OK`)) pending.resolve(payload);
      else pending.reject(new Error(payload));
    }
  }

  command(command) {
    return new Promise((resolve, reject) => {
      const tag = `A${String(this.tagCounter++).padStart(4, '0')}`;
      this.pending.set(tag, { resolve, reject });
      this.socket.write(`${tag} ${command}\r\n`);
    });
  }

  close() {
    if (this.socket) this.socket.end();
  }
}

function parseListMailboxes(raw) {
  const boxes = [];
  const re = /\* LIST \([^)]*\) "[^"]*" (.+?)\r\n/g;
  let match;
  while ((match = re.exec(raw)) !== null) {
    let name = match[1].trim();
    if (name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1);
    boxes.push(name);
  }
  return boxes;
}

function parseSearchUids(raw) {
  const match = raw.match(/\* SEARCH(.*)\r\n/);
  if (!match) return [];
  return match[1].trim().split(/\s+/).filter(Boolean).map(Number).filter(Number.isFinite);
}

function parseFetchedHeaders(raw) {
  const entries = [];
  const re = /\* \d+ FETCH[\s\S]*?\{\d+\}\r\n([\s\S]*?)\r\n\)\r\n/g;
  let match;
  while ((match = re.exec(raw)) !== null) {
    const lines = match[1].split(/\r\n/);
    const headers = {};
    let currentKey = null;
    for (const line of lines) {
      if (!line) continue;
      if (/^[ \t]/.test(line) && currentKey) {
        headers[currentKey] += ` ${line.trim()}`;
        continue;
      }
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      currentKey = line.slice(0, idx).trim().toLowerCase();
      headers[currentKey] = line.slice(idx + 1).trim();
    }
    entries.push({
      subject: decodeMimeWords(headers.subject || ''),
      to: decodeMimeWords(headers.to || ''),
      date: headers.date || '',
    });
  }
  return entries;
}

// ─── Scan Gmail Sent for "Your Verification Code" ───
async function collectVerificationRecipients() {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.error('Missing EMAIL_USER or EMAIL_PASS');
    return [];
  }

  const client = new ImapClient();
  await client.connect();
  try {
    await client.command(`LOGIN "${EMAIL_USER}" "${EMAIL_PASS}"`);
    const listRaw = await client.command('LIST "" "*"');
    const mailboxes = parseListMailboxes(listRaw);
    const sentMailbox = mailboxes.find((name) => /sent mail/i.test(name)) || mailboxes.find((name) => /sent/i.test(name)) || '"[Gmail]/Sent Mail"';
    const selectMailbox = sentMailbox.includes(' ') && !sentMailbox.startsWith('"') ? `"${sentMailbox}"` : sentMailbox;
    await client.command(`SELECT ${selectMailbox}`);

    // Search for emails with subject "Your Verification Code"
    const searchRaw = await client.command('UID SEARCH SUBJECT "Your Verification Code"');
    const uids = parseSearchUids(searchRaw);
    console.log(`Found ${uids.length} sent emails with subject "Your Verification Code"`);

    const recipients = new Set();

    for (let i = 0; i < uids.length; i += 50) {
      const batch = uids.slice(i, i + 50);
      const fetchRaw = await client.command(`UID FETCH ${batch.join(',')} (BODY.PEEK[HEADER.FIELDS (SUBJECT TO DATE)])`);
      const entries = parseFetchedHeaders(fetchRaw);
      for (const entry of entries) {
        // Double-check subject contains "Verification Code"
        if (!/verification code/i.test(entry.subject)) continue;
        const emails = extractEmails(entry.to);
        for (const email of emails) {
          if (!isSystemEmail(email)) {
            recipients.add(email);
          }
        }
      }
    }

    console.log(`Unique recipient emails: ${recipients.size}`);
    return [...recipients].sort();
  } finally {
    try { await client.command('LOGOUT'); } catch {}
    client.close();
  }
}

// ─── Main ───
async function main() {
  console.log(`\n=== Register Verification Code Recipients ===`);
  console.log(`Mode: ${APPLY ? '🔴 APPLY (will create users)' : '🟢 DRY RUN'}\n`);

  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI / DATABASE_URL');
    process.exit(1);
  }

  // Step 1: Collect emails from Gmail Sent
  console.log('Step 1: Scanning Gmail Sent folder...');
  const recipientEmails = await collectVerificationRecipients();
  if (recipientEmails.length === 0) {
    console.log('No verification code recipients found.');
    return;
  }

  // Step 2: Connect to MongoDB and check existing users
  console.log('\nStep 2: Checking existing users in DB...');
  const mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();

  try {
    const db = mongoClient.db();
    const usersCol = db.collection('users');

    // Get all existing emails from DB (lowercased)
    const existingUsers = await usersCol.find(
      {},
      { projection: { email: 1, role: 1 } }
    ).toArray();
    const existingEmails = new Set(existingUsers.map((u) => normalizeEmail(u.email)));

    console.log(`Total users in DB: ${existingUsers.length}`);
    console.log(`Total verification recipients: ${recipientEmails.length}`);

    // Step 3: Find emails NOT in DB
    const missingEmails = recipientEmails.filter((email) => !existingEmails.has(email));
    const alreadyExists = recipientEmails.filter((email) => existingEmails.has(email));

    console.log(`\nAlready registered: ${alreadyExists.length}`);
    console.log(`Missing (need to register): ${missingEmails.length}`);

    if (missingEmails.length === 0) {
      console.log('\n✅ All verification recipients are already registered!');
      return;
    }

    console.log('\n--- Missing emails ---');
    missingEmails.forEach((email, i) => console.log(`  ${i + 1}. ${email}`));

    if (!APPLY) {
      console.log(`\n🟡 DRY RUN: No users created. Run with --apply to register them.`);
      return;
    }

    // Step 4: Register missing emails
    console.log('\nStep 4: Registering missing users...');
    const hashedPassword = await argon2.hash(DEFAULT_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    let created = 0;
    let failed = 0;

    for (const email of missingEmails) {
      const now = new Date();
      const namePart = email.split('@')[0].replace(/[._+-]/g, ' ').trim() || 'User';
      const doc = {
        name: namePart,
        email: email,
        password: hashedPassword,
        role: 'user',
        createdAt: now,
        updatedAt: now,
      };

      try {
        const result = await usersCol.insertOne(doc);
        created++;
        console.log(`  ✅ Created: ${email} (id: ${result.insertedId})`);
      } catch (err) {
        if (err.code === 11000) {
          console.log(`  ⚠️  Duplicate (race): ${email}`);
        } else {
          console.log(`  ❌ Failed: ${email} — ${err.message}`);
          failed++;
        }
      }
    }

    console.log(`\n=== Done ===`);
    console.log(`Created: ${created}, Failed: ${failed}`);
  } finally {
    await mongoClient.close();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
