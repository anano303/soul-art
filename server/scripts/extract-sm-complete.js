'use strict';
/**
 * Deep scan: read raw chat JSON and find ALL SM_XXXX → PROMOXXXX entries
 * by scanning raw file content (not just extracted strings).
 * Also handles partial matches from context windows.
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

  // Collect all raw text across all files (un-JSON-parsed) for pattern matching
  const allRaw = [];
  for (const f of files) {
    try {
      const raw = fs.readFileSync(f, 'utf8');
      allRaw.push(raw);
    } catch (_) {}
  }
  const megaText = allRaw.join('\n\n');

  // Pattern 1: name (email): SM_XXX → PROMOYYY  Orders: N, Commissions: N, Tracking: N, Balance: N
  // (in raw JSON, special chars may be escaped but emails won't be)
  const FULL_PATTERN = /([^()\n]{0,60}?)\s*\(([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\)\s*:?\s*(SM_[A-Z0-9]{6,12})\s*(?:\\u2192|→|->|\\\\u2192)\s*(PROMO[A-Z0-9]{4,12})[\s\\n]*Orders:\s*(\d+)[\s,]*Commissions:\s*(\d+)[\s,]*Tracking:\s*(\d+)[\s,]*Balance:\s*([\d.]+)/gi;

  // Pattern 2: email): SM_XXX → PROMOYYY (without stats)
  const SIMPLE_PATTERN = /\(([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\)\s*:?\s*(SM_[A-Z0-9]{6,12})\s*(?:\\u2192|→|->|\\\\u2192)\s*(PROMO[A-Z0-9]{4,12})/gi;

  // Pattern 3: SM_XXX followed within 400 chars by email
  const SM_CODE_PATTERN = /(SM_[A-Z0-9]{6,12})/g;

  const smEntries = new Map(); // email -> { name, smCode, promoCode, orders, commissions, tracking, balance }

  // Pass 1: full pattern
  let m;
  while ((m = FULL_PATTERN.exec(megaText)) !== null) {
    const [, name, email, smCode, promoCode, orders, commissions, tracking, balance] = m;
    const key = email.toLowerCase();
    if (/example\.|noreply|no-reply|mongodb\.net|ollama|x\.ai|cluster0/.test(key)) continue;
    if (!smEntries.has(key)) {
      smEntries.set(key, {
        email: key,
        name: name.trim(),
        smCode,
        promoCode,
        orders: parseInt(orders),
        commissions: parseInt(commissions),
        tracking: parseInt(tracking),
        balance: parseFloat(balance),
      });
    }
  }

  // Pass 2: simple pattern (for those without stats)
  SIMPLE_PATTERN.lastIndex = 0;
  while ((m = SIMPLE_PATTERN.exec(megaText)) !== null) {
    const [, email, smCode, promoCode] = m;
    const key = email.toLowerCase();
    if (/example\.|noreply|no-reply|mongodb\.net|ollama|x\.ai|cluster0/.test(key)) continue;
    if (!smEntries.has(key)) {
      smEntries.set(key, { email: key, name: '', smCode, promoCode, orders: null, commissions: null, tracking: null, balance: null });
    } else {
      // Supplement missing data
      const rec = smEntries.get(key);
      if (!rec.smCode) rec.smCode = smCode;
      if (!rec.promoCode) rec.promoCode = promoCode;
    }
  }

  // Pass 3: SM code → email proximity search
  SM_CODE_PATTERN.lastIndex = 0;
  while ((m = SM_CODE_PATTERN.exec(megaText)) !== null) {
    const smCode = m[1];
    const idx = m.index;
    const ctx = megaText.slice(Math.max(0, idx - 400), Math.min(megaText.length, idx + 400));
    const emailMatch = ctx.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/);
    if (!emailMatch) continue;
    const key = emailMatch[0].toLowerCase();
    if (/example\.|noreply|no-reply|mongodb\.net|ollama|x\.ai|cluster0/.test(key)) continue;
    if (!smEntries.has(key)) {
      // Only add if there's a PROMO code nearby too
      const promoMatch = ctx.match(/PROMO[A-Z0-9]{4,12}/);
      smEntries.set(key, {
        email: key,
        name: '',
        smCode,
        promoCode: promoMatch ? promoMatch[0] : null,
        orders: null, commissions: null, tracking: null, balance: null,
      });
    } else {
      const rec = smEntries.get(key);
      if (!rec.smCode) rec.smCode = smCode;
    }
  }

  // Also manually add known entries from context snippets we saw earlier
  // (these were confirmed in scan output context)
  const KNOWN_SM = [
    { email: 'hr.higia@gmail.com',      name: 'ანასტასია ასანიძე', smCode: 'SM_RKKUAAZ4', promoCode: 'PROMO57317', orders: 0, commissions: 0, tracking: 0, balance: 0 },
    { email: 'earjevanidzee@gmail.com',  name: 'ჯილდა არჯევანიძე', smCode: 'SM_IQ62QZ52', promoCode: 'PROMO33276', orders: 0, commissions: 0, tracking: 0, balance: 0 },
    { email: 'salesanni@gmail.com',      name: 'Ani Beroshvili',   smCode: 'SM_53BXL84I', promoCode: 'PROMO30782', orders: 0, commissions: 0, tracking: 1, balance: 0 },
    { email: 'tsuladzekato@gmail.com',   name: 'Kato Tsuladze',    smCode: 'SM_8BS5XSED', promoCode: 'PROMO31422', orders: 0, commissions: 0, tracking: 0, balance: 0 },
    { email: 'ninanm777@gmail.com',      name: 'ნინა მეტრეველი',  smCode: 'SM_RS7FTEMJ', promoCode: 'PROMO47977', orders: 0, commissions: 0, tracking: 0, balance: 0 },
    { email: 'mayabekauri@gmail.com',    name: 'მაია ბექაური',    smCode: 'SM_BBZQGUIZ', promoCode: 'PROMO26539', orders: 0, commissions: 0, tracking: 45, balance: 0 },
    { email: 'tamtanarimanidze8@gmail.com', name: 'თამთა',        smCode: null,           promoCode: null,         orders: 0, commissions: 0, tracking: 0, balance: 0 },
  ];
  for (const known of KNOWN_SM) {
    const key = known.email.toLowerCase();
    if (!smEntries.has(key)) {
      smEntries.set(key, known);
    } else {
      const rec = smEntries.get(key);
      if (!rec.smCode && known.smCode) rec.smCode = known.smCode;
      if (!rec.promoCode && known.promoCode) rec.promoCode = known.promoCode;
      if (!rec.name && known.name) rec.name = known.name;
    }
  }

  // Enrich and sort
  const results = [];
  for (const [email, rec] of smEntries) {
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

  results.sort((a, b) => {
    const hasCodeA = a.smCode ? 1 : 0;
    const hasCodeB = b.smCode ? 1 : 0;
    if (hasCodeB !== hasCodeA) return hasCodeB - hasCodeA;
    return (b.tracking || 0) - (a.tracking || 0);
  });

  console.log(`\n===== COMPLETE SALES MANAGER LIST (${results.length} total) =====\n`);

  const SM_ROLES = ['sales_manager', 'seller_sales_manager'];
  const needsUpdate = results.filter(r => r.inDb && !SM_ROLES.includes(r.currentRole) && r.smCode);
  const alreadySM = results.filter(r => SM_ROLES.includes(r.currentRole));
  const notInDb = results.filter(r => !r.inDb && !['s@gmail.com','your@email.com','sales@x.ai'].includes(r.email));

  console.log('[ CONFIRMED SM (with SM_ code) ]\n');
  const confirmed = results.filter(r => r.smCode && !['admin','seller','seller_sales_manager'].includes(r.currentRole));
  confirmed.forEach(r => {
    const tag = SM_ROLES.includes(r.currentRole) ? '✅' : '⚠️needs_update';
    console.log(`${tag} ${r.email}`);
    console.log(`   Name: ${r.name || r.dbName || '?'}`);
    console.log(`   SM:    ${r.smCode}  PROMO: ${r.promoCode || '?'}`);
    if (r.orders !== null) console.log(`   Stats → Orders:${r.orders} Commissions:${r.commissions} Tracking:${r.tracking} Balance:${r.balance}`);
    if (r.dbPhone) console.log(`   Phone: ${r.dbPhone}`);
    if (r.dbRef) console.log(`   DB referralCode: ${r.dbRef}`);
    console.log('');
  });

  console.log('\n=== SUMMARY ===');
  console.log(`Already SM role: ${alreadySM.length}`);
  console.log(`Needs role->sales_manager + promoCode update: ${needsUpdate.length}`);
  console.log(`NOT in DB: ${notInDb.length}`);

  // Save
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'sm-complete-list.json');
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nSaved: ${outFile}`);

  await client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
