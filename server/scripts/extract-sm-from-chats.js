'use strict';
/**
 * Extract structured sales manager list from VS Code chat sessions.
 * Pattern: "Name (email): SM_XXXX → PROMOXXXX   Orders: N, Commissions: N, Tracking: N, Balance: N"
 * Also extracts referral codes and phone numbers for each SM.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const CHAT_DIR = 'C:\\Users\\a.beroshvili\\AppData\\Roaming\\Code\\User\\workspaceStorage\\a8560dbf6b8949e67e43fa5dbceea9f5\\chatSessions';
const DB_NAME = 'test';

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

function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (/^5\d{8}$/.test(digits)) return `+995${digits}`;
  if (/^995\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const client = await MongoClient.connect(uri);
  const db = client.db(DB_NAME);

  const existingUsers = await db.collection('users').find(
    {},
    { projection: { _id: 1, email: 1, role: 1, phoneNumber: 1, referralCode: 1, name: 1 } }
  ).toArray();
  const existingByEmail = new Map(existingUsers.map(u => [u.email.toLowerCase(), u]));

  const files = collectJsonFiles(CHAT_DIR);
  console.log(`Scanning ${files.length} chat files...\n`);

  // Main SM entry pattern (from the status report printout in chats)
  // e.g.: ✅ სალომე ხოზრევანიძე (salokhozrevanidze21@gmail.com): SM_9XXNJE2X → PROMO92771   Orders: 0, Commissions: 0, Tracking: 0, Balance: 0
  const SM_ENTRY_RE = /(?:✅|SM_)\s*([^\n(]{0,60}?)\s*\(([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\)\s*:?\s*(SM_[A-Z0-9]{6,12})\s*(?:→|->)\s*(PROMO[A-Z0-9]{4,10})\s*Orders:\s*(\d+),?\s*Commissions:\s*(\d+),?\s*Tracking:\s*(\d+),?\s*Balance:\s*([\d.]+)/gi;

  // Also look for SM entries without the full stats
  // e.g.: (email): SM_XXXX → PROMOYYY
  const SM_SIMPLE_RE = /\(([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\)\s*:?\s*(SM_[A-Z0-9]{6,12})\s*(?:→|->)\s*(PROMO[A-Z0-9]{4,10})/gi;

  // Also match "სახელი: X\nEmail: email\nტელეფონი: phone"
  const SM_BLOCK_RE = /სახელი:\s*([^\n]+)\n\s*Email:\s*([^\n]+)\n\s*ტელეფონი:\s*([^\n]+)/gi;

  // SM code to email mapping  
  const smMap = new Map(); // email -> { name, smCode, promoCode, orders, commissions, tracking, balance }

  for (const file of files) {
    const text = extractText(file);
    if (!text) continue;
    if (!text.includes('SM_') && !text.includes('sales_manager') && !text.includes('სეილ')) continue;

    // Full structured entries
    let m;
    SM_ENTRY_RE.lastIndex = 0;
    while ((m = SM_ENTRY_RE.exec(text)) !== null) {
      const [, name, email, smCode, promoCode, orders, commissions, tracking, balance] = m;
      const key = email.toLowerCase().trim();
      if (!smMap.has(key) || smMap.get(key).orders === undefined) {
        smMap.set(key, {
          name: name.trim(),
          email: key,
          smCode,
          promoCode,
          orders: parseInt(orders),
          commissions: parseInt(commissions),
          tracking: parseInt(tracking),
          balance: parseFloat(balance),
        });
      }
    }

    // Simple SM entries (no stats)
    SM_SIMPLE_RE.lastIndex = 0;
    while ((m = SM_SIMPLE_RE.exec(text)) !== null) {
      const [, email, smCode, promoCode] = m;
      const key = email.toLowerCase().trim();
      if (!smMap.has(key)) {
        smMap.set(key, { email: key, name: '', smCode, promoCode, orders: null, commissions: null, tracking: null, balance: null });
      }
    }

    // Block format (სახელი / Email / ტელეფონი)
    SM_BLOCK_RE.lastIndex = 0;
    while ((m = SM_BLOCK_RE.exec(text)) !== null) {
      const [, name, emailRaw, phoneRaw] = m;
      const email = emailRaw.trim().toLowerCase();
      if (!email.includes('@')) continue;
      const phone = normalizePhone(phoneRaw.trim());
      if (!smMap.has(email)) smMap.set(email, { email, name: name.trim(), smCode: null, promoCode: null, orders: null, commissions: null, tracking: null, balance: null });
      const rec = smMap.get(email);
      if (!rec.name) rec.name = name.trim();
      if (phone && !rec.phone) rec.phone = phone;
    }
  }

  // Also scan for standalone SM_XXXX occurrences with email nearby
  // to catch any we missed
  for (const file of files) {
    const text = extractText(file);
    if (!text || !text.includes('SM_')) continue;
    const smCodeRe = /(SM_[A-Z0-9]{6,12})/g;
    let m;
    while ((m = smCodeRe.exec(text)) !== null) {
      const smCode = m[1];
      const idx = m.index;
      const ctx = text.slice(Math.max(0, idx - 300), Math.min(text.length, idx + 300));
      // Find email in context
      const em = ctx.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/);
      if (!em) continue;
      const key = em[0].toLowerCase();
      if (/example\.|noreply|no-reply|mongodb\.net|x\.ai|ollama/.test(key)) continue;
      if (!smMap.has(key)) {
        smMap.set(key, { email: key, name: '', smCode, promoCode: null, orders: null, commissions: null, tracking: null, balance: null });
      }
    }
  }

  console.log(`Found ${smMap.size} unique SM entries in chats\n`);

  // Enrich with DB data
  const results = [];
  for (const [email, rec] of smMap) {
    const dbUser = existingByEmail.get(email);
    results.push({
      ...rec,
      inDb: !!dbUser,
      currentRole: dbUser ? dbUser.role : 'NOT_IN_DB',
      dbId: dbUser ? String(dbUser._id) : null,
      dbPhone: dbUser ? dbUser.phoneNumber : null,
      dbRef: dbUser ? dbUser.referralCode : null,
      dbName: dbUser ? dbUser.name : null,
    });
  }

  // Sort: SM entries first, then by tracking desc
  results.sort((a, b) => {
    if (a.smCode && !b.smCode) return -1;
    if (!a.smCode && b.smCode) return 1;
    return (b.tracking || 0) - (a.tracking || 0);
  });

  console.log('=== FULL SALES MANAGER LIST FROM CHATS ===\n');
  const ROLES_SM = ['sales_manager', 'seller_sales_manager'];

  for (const r of results) {
    const roleTag = ROLES_SM.includes(r.currentRole) ? '✅SM' : r.currentRole === 'NOT_IN_DB' ? '❌MISSING' : `⚠️${r.currentRole}`;
    console.log(`[${roleTag}] ${r.email}`);
    console.log(`  Name: ${r.name || r.dbName || '?'}`);
    if (r.smCode) console.log(`  SM Code:    ${r.smCode}`);
    if (r.promoCode) console.log(`  PROMO Code: ${r.promoCode}`);
    if (r.orders !== null) console.log(`  Stats → Orders:${r.orders} Commissions:${r.commissions} Tracking:${r.tracking} Balance:${r.balance}`);
    if (r.dbPhone || r.phone) console.log(`  Phone: ${r.dbPhone || r.phone}`);
    if (r.dbRef) console.log(`  DB referralCode: ${r.dbRef}`);
    console.log('');
  }

  // Summary
  const alreadySM = results.filter(r => ROLES_SM.includes(r.currentRole));
  const needsRoleUpdate = results.filter(r => r.inDb && !ROLES_SM.includes(r.currentRole));
  const notInDb = results.filter(r => !r.inDb);

  console.log('=== SUMMARY ===');
  console.log(`Total SM entries found in chats: ${results.length}`);
  console.log(`  Already have SM role: ${alreadySM.length}`);
  console.log(`  In DB but role is NOT sales_manager: ${needsRoleUpdate.length}`);
  console.log(`  NOT in DB at all: ${notInDb.length}`);

  if (needsRoleUpdate.length) {
    console.log('\nNEED ROLE UPDATE:');
    needsRoleUpdate.forEach(r => {
      console.log(`  ${r.email} | current: ${r.currentRole} | smCode: ${r.smCode || '?'} | promo: ${r.promoCode || '?'}`);
    });
  }

  if (notInDb.length) {
    console.log('\nNOT IN DB:');
    notInDb.forEach(r => console.log(`  ${r.email}`));
  }

  // Save output
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'sm-full-list.json');
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nSaved: ${outFile}`);

  await client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
