'use strict';
/**
 * Recover phone, accountNumber, identificationNumber for ALL sellers/sales_managers
 * from VS Code chat session files.
 *
 * Strategy per email:
 *   - Scan every chat file for that email string
 *   - Extract phone/IBAN/ID from a 350-char window around each mention
 *   - Score candidates; apply if score is high enough and field is missing from DB
 *
 * DRY-RUN by default. Pass --apply to write.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const DB_NAME = 'test';
const CHAT_DIR =
  'C:\\Users\\a.beroshvili\\AppData\\Roaming\\Code\\User\\workspaceStorage\\a8560dbf6b8949e67e43fa5dbceea9f5\\chatSessions';

// ── helpers ──────────────────────────────────────────────────────────────────

function collectJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...collectJsonFiles(full));
    else if (e.isFile() && e.name.toLowerCase().endsWith('.json')) out.push(full);
  }
  return out;
}

function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (/^5\d{8}$/.test(digits)) return `+995${digits}`;
  if (/^9955\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

function safeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function score(map, key, pts) {
  map.set(key, (map.get(key) || 0) + pts);
}

function topByScore(map, minScore) {
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  return entries[0][1] >= minScore ? entries[0][0] : null;
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const uri = process.env.MONGODB_URI;
  const client = await MongoClient.connect(uri);
  const db = client.db(DB_NAME);

  // Load all sellers + sales_managers that have at least one missing detail field
  const roles = ['seller', 'sales_manager', 'seller_sales_manager', 'auction_admin'];
  const allUsers = await db
    .collection('users')
    .find(
      { role: { $in: roles } },
      {
        projection: {
          email: 1,
          role: 1,
          phoneNumber: 1,
          accountNumber: 1,
          identificationNumber: 1,
          name: 1,
        },
      }
    )
    .toArray();

  // Filter to those missing at least one field
  const targets = allUsers.filter(
    (u) => !u.phoneNumber || !u.accountNumber || !u.identificationNumber
  );

  console.log(`Total ${roles.join('/')} users: ${allUsers.length}`);
  console.log(`Need at least one detail: ${targets.length}`);

  if (!targets.length) {
    console.log('Nothing to do.');
    await client.close();
    return;
  }

  const files = collectJsonFiles(CHAT_DIR);
  console.log(`Chat files: ${files.length}`);

  // Build fast lookup: which files mention which emails
  // We read each file once and check for all target emails
  const emailSet = targets.map((u) => u.email.toLowerCase());
  const fileMatches = new Map(); // email -> [{ file, raw }]

  process.stdout.write('Scanning files');
  for (const file of files) {
    let raw;
    try {
      raw = fs.readFileSync(file, 'utf8');
    } catch (_) {
      continue;
    }
    if (!raw) continue;

    const lraw = raw.toLowerCase();
    for (const email of emailSet) {
      if (lraw.includes(email)) {
        if (!fileMatches.has(email)) fileMatches.set(email, []);
        fileMatches.get(email).push({ file, raw });
      }
    }
    process.stdout.write('.');
  }
  process.stdout.write('\n');

  // ── per-user extraction ──────────────────────────────────────────────────
  const updates = [];
  const WINDOW = 400;

  for (const user of targets) {
    const email = user.email.toLowerCase();
    const matchFiles = fileMatches.get(email) || [];

    if (!matchFiles.length) continue;

    const phones   = new Map();
    const accounts = new Map();
    const ids      = new Map();

    for (const { raw } of matchFiles) {
      const emailRe = new RegExp(safeRegex(email), 'gi');
      let m;
      while ((m = emailRe.exec(raw)) !== null) {
        const start = Math.max(0, m.index - WINDOW);
        const end   = Math.min(raw.length, m.index + email.length + WINDOW);
        const ctx   = raw.slice(start, end);
        const lower = ctx.toLowerCase();

        // Skip contexts that are clearly tool/infra noise
        if (/tool_call|toolid|messageid|encrypted/.test(lower)) continue;

        // Phone
        const phoneMatches = ctx.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || [];
        for (const p of phoneMatches) {
          const n = normalizePhone(p);
          if (!n) continue;
          score(phones, n, n.startsWith('+9955') ? 4 : 2);
        }

        // IBAN
        const ibans = ctx.match(/GE\d{2}[A-Z]{2}\d{16}/g) || [];
        for (const a of ibans) score(accounts, a, 6);

        const accWithKw = /(?:account|ანგარიშ|საბანკო|iban)[^A-Z0-9]{0,25}([A-Z0-9]{16,34})/gi;
        let am;
        while ((am = accWithKw.exec(ctx)) !== null) {
          const v = am[1].toUpperCase();
          if (v.length >= 16) score(accounts, v, 3);
        }

        // Personal ID (11-digit, strict keyword requirement)
        const idRe = /(?:პირადი\s*ნომერი|საიდენტ|identification\s*number|personal\s*number|identificationnumber)[^0-9]{0,20}(\d{11})/gi;
        let im;
        while ((im = idRe.exec(ctx)) !== null) {
          score(ids, im[1], 5);
        }

        // Admin-update log pattern: identificationNumber: 'XXXXXXXXXXX'
        const adminLog = /identificationNumber[^0-9'\"]{0,10}['\":]?\s*['\"']?(\d{11})['\"']?/gi;
        let al;
        while ((al = adminLog.exec(ctx)) !== null) {
          score(ids, al[1], 8);
        }
      }
    }

    const foundPhone   = topByScore(phones,   4);
    const foundAccount = topByScore(accounts, 6);
    const foundId      = topByScore(ids,      5);

    const patch = {};
    if (!user.phoneNumber   && foundPhone)   patch.phoneNumber   = foundPhone;
    if (!user.accountNumber && foundAccount) patch.accountNumber = foundAccount;
    if (!user.identificationNumber && foundId) patch.identificationNumber = foundId;

    if (!Object.keys(patch).length) continue;

    console.log(`\n${APPLY ? 'UPDATING' : 'WOULD UPDATE'} [${user.role}] ${user.email}`);
    Object.entries(patch).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

    updates.push({ _id: user._id, email: user.email, patch });

    if (APPLY) {
      await db.collection('users').updateOne({ _id: user._id }, { $set: patch });
    }
  }

  console.log(`\n=== SUMMARY: ${updates.length} updates ${APPLY ? 'applied' : 'planned'} ===`);

  if (!APPLY && updates.length) {
    console.log('\nRun with --apply to write to DB.');
  }

  // Save report
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'all-seller-details-recovery.json'),
    JSON.stringify(updates, null, 2),
    'utf8'
  );

  await client.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
