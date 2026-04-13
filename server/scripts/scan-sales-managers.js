'use strict';
/**
 * Scan VS Code chat sessions for sales_manager users, referral codes, commission/progress data.
 * Output: full report of what was found.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const CHAT_DIR = 'C:\\Users\\a.beroshvili\\AppData\\Roaming\\Code\\User\\workspaceStorage\\a8560dbf6b8949e67e43fa5dbceea9f5\\chatSessions';
const DB_NAME = 'test';
const WINDOW = 600; // chars around a match

function collectJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...collectJsonFiles(full));
    else if (e.isFile() && e.name.toLowerCase().endsWith('.json')) files.push(full);
  }
  return files;
}

function extractText(jsonFile) {
  try {
    const raw = fs.readFileSync(jsonFile, 'utf8');
    // Pull all string values from JSON — covers message content deeply nested
    const texts = [];
    const strRegex = /"(?:[^"\\]|\\.)*"/g;
    let m;
    while ((m = strRegex.exec(raw)) !== null) {
      try {
        const val = JSON.parse(m[0]);
        if (typeof val === 'string' && val.length > 3) texts.push(val);
      } catch (_) {}
    }
    return texts.join('\n');
  } catch (_) {
    return '';
  }
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// Georgian phone normalization
function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (/^5\d{8}$/.test(digits)) return `+995${digits}`;
  if (/^995\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

// Referral code patterns: uppercase alphanumeric 4-12 chars, often prefixed REF or SM or after keyword
function extractRefCodes(text) {
  const codes = new Set();
  // explicit labeled: referralCode, ref_code, refCode, კოდი, რეფ კოდი followed by value
  const labeled = /(?:referralCode|ref[_\s-]?code|კოდი|რეფ\s*კოდ[ი]?)\s*[=:"\s]+([A-Z0-9]{4,14})/gi;
  let m;
  while ((m = labeled.exec(text)) !== null) {
    codes.add(m[1].toUpperCase());
  }
  // Standalone uppercase codes that look like referral codes (5-12 uppercase+digit)
  const standalone = /\b([A-Z]{2,}[0-9]{2,}[A-Z0-9]{0,8}|[A-Z0-9]{5,12})\b/g;
  while ((m = standalone.exec(text)) !== null) {
    const c = m[1];
    // Must be mixed or 5+ chars, not all digits, not common words
    if (c.length >= 5 && c.length <= 12 && /[A-Z]/.test(c) && /[0-9]/.test(c)) {
      codes.add(c);
    }
  }
  return codes;
}

// Sales manager role signals (Georgian + English)
const SM_TERMS = [
  'sales_manager', 'sales manager', 'salesmanager',
  'გაყიდვების მენეჯერ', 'გაყიდვ', 'სეილ', 'sales', 'komisii', 'კომისი',
  'referral', 'referralcode', 'ref code', 'რეფ', 'partner', 'პარტნიორ',
  'commission', 'commiss', 'კომისი',
];

function hasSalesManagerSignal(text) {
  const t = text.toLowerCase();
  return SM_TERMS.some(term => t.includes(term.toLowerCase()));
}

// Commission/progress patterns: numbers with GEL or % near email context
function extractProgress(context) {
  const results = [];
  const moneyRe = /(\d[\d\s,.]*(?:\.?\d+)?)\s*(?:GEL|₾|lari|ლარ|%|percent)/gi;
  let m;
  while ((m = moneyRe.exec(context)) !== null) {
    results.push(m[0].trim());
  }
  return results;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const client = await MongoClient.connect(uri);
  const db = client.db(DB_NAME);

  // Load all existing users for reference
  const existingUsers = await db.collection('users').find(
    {},
    { projection: { _id: 1, email: 1, role: 1, phoneNumber: 1, referralCode: 1, name: 1 } }
  ).toArray();

  const existingByEmail = new Map(existingUsers.map(u => [u.email.toLowerCase(), u]));

  console.log(`Existing users in DB: ${existingUsers.length}`);

  const files = collectJsonFiles(CHAT_DIR);
  console.log(`Chat session files: ${files.length}\n`);

  // Per-email accumulator
  const candidates = new Map(); // email -> { files, phoneCandidates, refCodes, smSignalCount, userSignalCount, progressItems, contexts }

  for (const file of files) {
    const text = extractText(file);
    if (!text) continue;

    // Only process files with sales/referral signals
    if (!hasSalesManagerSignal(text)) continue;

    let emailMatch;
    EMAIL_RE.lastIndex = 0;
    while ((emailMatch = EMAIL_RE.exec(text)) !== null) {
      const email = emailMatch[0].toLowerCase();

      // Skip obvious system emails
      if (/example\.|noreply|no-reply|@cluster0\.|mongodb\.net|ollama|github\.com/.test(email)) continue;
      if (email.length < 6) continue;

      const idx = emailMatch.index;
      const start = Math.max(0, idx - WINDOW);
      const end = Math.min(text.length, idx + email.length + WINDOW);
      const ctx = text.slice(start, end);

      if (!hasSalesManagerSignal(ctx)) continue;

      if (!candidates.has(email)) {
        candidates.set(email, {
          email,
          fileCount: 0,
          phoneCandidates: new Set(),
          refCodes: new Set(),
          smSignalCount: 0,
          progressItems: [],
          contexts: [],
        });
      }

      const rec = candidates.get(email);
      rec.fileCount++;

      // Phone extraction near this email
      const phoneRe = /(?:\+?\d[\d\s().-]{7,}\d)/g;
      let pm;
      while ((pm = phoneRe.exec(ctx)) !== null) {
        const n = normalizePhone(pm[0]);
        if (n) rec.phoneCandidates.add(n);
      }

      // Referral code extraction
      extractRefCodes(ctx).forEach(c => rec.refCodes.add(c));

      // SM signal count
      const ctxLower = ctx.toLowerCase();
      SM_TERMS.forEach(t => {
        if (ctxLower.includes(t.toLowerCase())) rec.smSignalCount++;
      });

      // Progress/commission
      extractProgress(ctx).forEach(p => rec.progressItems.push(p));

      // Save a snippet of context
      if (rec.contexts.length < 3) {
        rec.contexts.push(ctx.slice(0, 300).replace(/\n+/g, ' ').trim());
      }
    }
  }

  // Sort by SM signal count descending
  const sorted = [...candidates.values()].sort((a, b) => b.smSignalCount - a.smSignalCount);

  console.log(`=== SALES MANAGER CANDIDATES FROM CHAT (${sorted.length} total) ===\n`);

  const currentSMs = existingUsers.filter(u => ['sales_manager', 'seller_sales_manager'].includes(u.role));
  console.log(`Currently in DB as sales_manager/seller_sales_manager: ${currentSMs.length}`);
  currentSMs.forEach(u => console.log(`  ${u.email} | ref=${u.referralCode || 'none'} | phone=${u.phoneNumber || 'none'}`));
  console.log('');

  const report = [];

  for (const rec of sorted) {
    const dbUser = existingByEmail.get(rec.email);
    const inDb = !!dbUser;
    const currentRole = dbUser ? dbUser.role : 'NOT_IN_DB';
    const dbRef = dbUser ? dbUser.referralCode : null;
    const dbPhone = dbUser ? dbUser.phoneNumber : null;

    const entry = {
      email: rec.email,
      smSignals: rec.smSignalCount,
      fileCount: rec.fileCount,
      inDb,
      currentRole,
      dbRef: dbRef || null,
      dbPhone: dbPhone || null,
      phoneCandidates: [...rec.phoneCandidates],
      refCodeCandidates: [...rec.refCodes].slice(0, 10),
      progress: [...new Set(rec.progressItems)].slice(0, 5),
      contextSample: rec.contexts[0] || '',
    };

    report.push(entry);

    console.log(`${inDb ? '[DB]' : '[NOT_IN_DB]'} ${rec.email}`);
    console.log(`  role=${currentRole} | smSignals=${rec.smSignalCount} | files=${rec.fileCount}`);
    if (entry.dbRef) console.log(`  DB refCode: ${entry.dbRef}`);
    if (entry.dbPhone) console.log(`  DB phone: ${entry.dbPhone}`);
    if (entry.phoneCandidates.length) console.log(`  phone candidates: ${entry.phoneCandidates.join(', ')}`);
    if (entry.refCodeCandidates.length) console.log(`  refCode candidates: ${entry.refCodeCandidates.join(', ')}`);
    if (entry.progress.length) console.log(`  progress/commission: ${entry.progress.join(', ')}`);
    console.log(`  ctx: ${entry.contextSample.slice(0, 200)}`);
    console.log('');
  }

  // Save full report
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'sales-manager-scan.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nFull report saved: ${outFile}`);

  await client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
