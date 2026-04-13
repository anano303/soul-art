'use strict';
/**
 * Extract detailed info for Sales Managers from chat history:
 * - Phone numbers
 * - Account numbers (bankNumber, accountNumber, IBAN)
 * - Personal ID numbers (identificationNumber, passportNumber, ID number)
 *
 * Then cross-reference with DB and report what needs to be filled.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const CHAT_DIR = 'C:\\Users\\a.beroshvili\\AppData\\Roaming\\Code\\User\\workspaceStorage\\a8560dbf6b8949e67e43fa5dbceea9f5\\chatSessions';
const DB_NAME = 'test';

// List of confirmed sales managers with their PROMO codes
const SM_CONFIRMED = [
  { email: 'anakvirikashvili055@gmail.com',    smCode: 'SM_DNGC0492', promoCode: 'PROMO34158' },
  { email: 'earjevanidzee@gmail.com',           smCode: 'SM_IQ62QZ52', promoCode: 'PROMO33276' },
  { email: 'georgeavsa1@gmail.com',             smCode: 'SM_L2ZOG0WF', promoCode: 'PROMO60345' },
  { email: 'hr.higia@gmail.com',                smCode: 'SM_Y0KNB7WW', promoCode: 'PROMO23157' },
  { email: 'iamageorgiansoldier@gmail.com',     smCode: 'SM_HEDUJI7U', promoCode: 'PROMO81750' },
  { email: 'iingushka@gmail.com',               smCode: 'SM_EBFD2K5L', promoCode: 'PROMO42462' },
  { email: 'kristina.kupunia.kris@mail.ru',     smCode: 'SM_BEYVUFWK', promoCode: 'PROMO30335' },
  { email: 'mariammiqo@gmail.com',              smCode: 'SM_S4OGI4G9', promoCode: 'PROMO55728' },
  { email: 'mariamsadgobelashvili09@gmail.com', smCode: 'SM_OMRL54PB', promoCode: 'PROMO99292' },
  { email: 'mayabekauri@gmail.com',             smCode: 'SM_BBZQGUIZ', promoCode: 'PROMO26539' },
  { email: 'mirandasulamanidze2018@gmail.com',  smCode: 'SM_GN9ZDX7R', promoCode: 'PROMO25661' },
  { email: 'mrmgoletiani@gmail.com',            smCode: 'SM_1SN0ZM5W', promoCode: 'PROMO65847' },
  { email: 'ninanm777@gmail.com',               smCode: 'SM_RS7FTEMJ', promoCode: 'PROMO47977' },
  { email: 'sales@gmail.com',                   smCode: 'SM_UQGM42CQ', promoCode: 'PROMO67029' },
  { email: 'salesanni@gmail.com',               smCode: 'SM_53BXL84I', promoCode: 'PROMO30782' },
  { email: 'salokhozrevanidze21@gmail.com',     smCode: 'SM_9XXNJE2X', promoCode: 'PROMO92771' },
  { email: 'tabatadzedali33@gmail.com',         smCode: 'SM_RCO9USSU', promoCode: 'PROMO67909' },
  { email: 'tamari.dardaganidze.1@gmail.com',   smCode: 'SM_Z8EB3EX3', promoCode: 'PROMO41635' },
  { email: 'tamtanarimanidze8@gmail.com',       smCode: 'SM_K2IV7JBX', promoCode: 'PROMO76030' },
  { email: 'tamuna777@yahoo.com',               smCode: 'SM_DLK9DC0B', promoCode: 'PROMO60702' },
  { email: 'teasamadashvili1980@gmail.com',     smCode: 'SM_39GDNCY7', promoCode: 'PROMO19683' },
  { email: 'temurimakaradze@gmail.com',         smCode: 'SM_IK8XCGN3', promoCode: 'PROMO59547' },
  { email: 'teonazarandia29@gmail.com',         smCode: 'SM_Z1SQWDEG', promoCode: 'PROMO81723' },
  { email: 'text2sale@gmail.com',               smCode: 'SM_V1KJDZ63', promoCode: 'PROMO30975' },
  { email: 'tony.johnes@ymail.com',             smCode: 'SM_RKKUAAZ4', promoCode: 'PROMO57317' },
  { email: 'torchinavasophio@gmail.com',        smCode: 'SM_FWCYUWOS', promoCode: 'PROMO63143' },
  { email: 'tsuladzekato@gmail.com',            smCode: 'SM_8BS5XSED', promoCode: 'PROMO31422' },
  { email: 'x.kilasonia97@gmail.com',           smCode: 'SM_0YGAEH90', promoCode: 'PROMO66563' },
];

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

  const files = collectJsonFiles(CHAT_DIR);
  const allText = files.map(f => extractText(f)).join('\n\n');

  console.log(`Scanning ${files.length} chat files for SM details...\n`);

  const results = [];

  for (const sm of SM_CONFIRMED) {
    const smEmail = sm.email.toLowerCase();
    // Build a context window around mentions of this SM's email
    const contextWin = 1200;
    const emailRe = new RegExp(sm.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    const phones = new Set();
    const accountNumbers = new Set();
    const idNumbers = new Set();
    let lastMention = null;

    let m;
    emailRe.lastIndex = 0;
    while ((m = emailRe.exec(allText)) !== null) {
      const idx = m.index;
      const start = Math.max(0, idx - contextWin);
      const end = Math.min(allText.length, idx + contextWin);
      const ctx = allText.slice(start, end);
      lastMention = ctx;

      // Extract phones
      const phoneRe = /(?:\+?\d[\d\s().-]{7,}\d)/g;
      let pm;
      while ((pm = phoneRe.exec(ctx)) !== null) {
        const n = normalizePhone(pm[0]);
        if (n) phones.add(n);
      }

      // Extract account/IBAN  (საბანკო ანგარიში, IBAN, accountNumber)
      const accountRe = /(?:საბანკო|IBAN|account\s*(?:number)?|ანგარიში|GE\d{2}[A-Z]{2}\d{16})[:\s]+(GE\d{2}[A-Z]{2}\d{16}|[A-Z]{2}\d{16,22}|\d{20,26})/gi;
      let am;
      while ((am = accountRe.exec(ctx)) !== null) {
        accountNumbers.add(am[1].toUpperCase());
      }

      // Extract ID numbers (11-13 digit sequences, Georgian ID format)
      const idRe = /(?:ID|ID\s*(?:number)?|უ\.ს\.უ\.ნ\.(?:\s*)?(?:კოდი)?|პირადი|IdentificationNumber|passport|პასპორტი)[:\s]*([0-9]{11,13})/gi;
      let idm;
      while ((idm = idRe.exec(ctx)) !== null) {
        idNumbers.add(idm[1]);
      }

      // Also look for bare 11-13 digit patterns in context
      const bareId = /\b(\d{11,13})\b/g;
      let bidm;
      while ((bidm = bareId.exec(ctx)) !== null) {
        const id = bidm[1];
        // Filter: must not look like dates, prices, order numbers
        if (!/20\d{2}|19\d{2}|^0{4,}/.test(id) && ctx.toLowerCase().includes('id') || ctx.toLowerCase().includes('identity') || ctx.toLowerCase().includes('უ')) {
          idNumbers.add(id);
        }
      }
    }

    // Check DB for current state
    const dbUser = await db.collection('users').findOne(
      { email: new RegExp('^' + sm.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
      { projection: { _id: 1, name: 1, phoneNumber: 1, accountNumber: 1, identificationNumber: 1 } }
    );

    results.push({
      email: sm.email,
      smCode: sm.smCode,
      promoCode: sm.promoCode,
      dbExists: !!dbUser,
      dbPhone: dbUser ? dbUser.phoneNumber : null,
      dbAccountNumber: dbUser ? dbUser.accountNumber : null,
      dbIdentificationNumber: dbUser ? dbUser.identificationNumber : null,
      chatPhones: [...phones],
      chatAccountNumbers: [...accountNumbers],
      chatIdNumbers: [...idNumbers],
      lastContext: lastMention ? lastMention.slice(0, 300) : '',
    });
  }

  console.log('=== SALES MANAGER DETAILED INFO ===\n');
  for (const r of results) {
    console.log(`${r.email} (${r.smCode})`);
    
    if (r.chatPhones.length) {
      console.log(`  💬 Chat phones: ${r.chatPhones.join(', ')}`);
      if (r.dbPhone) console.log(`  🗄️  DB phone: ${r.dbPhone}`);
      else console.log(`  ❌ DB phone: MISSING`);
    }
    
    if (r.chatAccountNumbers.length) {
      console.log(`  💬 Chat account: ${r.chatAccountNumbers.join(', ')}`);
      if (r.dbAccountNumber) console.log(`  🗄️  DB account: ${r.dbAccountNumber}`);
      else console.log(`  ❌ DB account: MISSING`);
    }

    if (r.chatIdNumbers.length) {
      console.log(`  💬 Chat ID: ${r.chatIdNumbers.join(', ')}`);
      if (r.dbIdentificationNumber) console.log(`  🗄️  DB ID: ${r.dbIdentificationNumber}`);
      else console.log(`  ❌ DB ID: MISSING`);
    }

    if (!r.chatPhones.length && !r.chatAccountNumbers.length && !r.chatIdNumbers.length) {
      console.log(`  (no detailed info found in chats)`);
    }

    console.log('');
  }

  // Summary
  const needsPhone = results.filter(r => r.chatPhones.length && !r.dbPhone);
  const needsAccount = results.filter(r => r.chatAccountNumbers.length && !r.dbAccountNumber);
  const needsId = results.filter(r => r.chatIdNumbers.length && !r.dbIdentificationNumber);

  console.log('=== UPDATES NEEDED ===');
  console.log(`Phone updates: ${needsPhone.length}`);
  console.log(`Account number updates: ${needsAccount.length}`);
  console.log(`ID number updates: ${needsId.length}`);

  // Save
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'sm-detailed-info.json'),
    JSON.stringify(results, null, 2),
    'utf8'
  );

  await client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
