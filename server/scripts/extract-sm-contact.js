'use strict';
/**
 * Quick scan: for each SM confirmed email, search in chat files for:
 * - Phone numbers
 * - Account numbers (IBAN, GE codes)
 * - ID numbers (11-13 digits)
 */

const fs = require('fs');
const path = require('path');

const CHAT_DIR = 'C:\\Users\\a.beroshvili\\AppData\\Roaming\\Code\\User\\workspaceStorage\\a8560dbf6b8949e67e43fa5dbceea9f5\\chatSessions';

const SM_EMAILS = [
  'anakvirikashvili055@gmail.com',
  'earjevanidzee@gmail.com',
  'georgeavsa1@gmail.com',
  'hr.higia@gmail.com',
  'iamageorgiansoldier@gmail.com',
  'iingushka@gmail.com',
  'kristina.kupunia.kris@mail.ru',
  'mariammiqo@gmail.com',
  'mariamsadgobelashvili09@gmail.com',
  'mayabekauri@gmail.com',
  'mirandasulamanidze2018@gmail.com',
  'mrmgoletiani@gmail.com',
  'ninanm777@gmail.com',
  'sales@gmail.com',
  'salesanni@gmail.com',
  'salokhozrevanidze21@gmail.com',
  'tabatadzedali33@gmail.com',
  'tamari.dardaganidze.1@gmail.com',
  'tamtanarimanidze8@gmail.com',
  'tamuna777@yahoo.com',
  'teasamadashvili1980@gmail.com',
  'temurimakaradze@gmail.com',
  'teonazarandia29@gmail.com',
  'text2sale@gmail.com',
  'tony.johnes@ymail.com',
  'torchinavasophio@gmail.com',
  'tsuladzekato@gmail.com',
  'x.kilasonia97@gmail.com',
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

function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (/^5\d{8}$/.test(digits)) return `+995${digits}`;
  if (/^995\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

const files = collectJsonFiles(CHAT_DIR);
console.log(`📁 Found ${files.length} chat files\n`);

// Load all text just once
let allText = '';
for (const f of files) {
  try {
    const raw = fs.readFileSync(f, 'utf8');
    allText += '\n' + raw;
  } catch (_) {}
}

console.log(`📄 Loaded ${(allText.length / 1024 / 1024).toFixed(2)} MB of text\n`);

const results = [];

for (const email of SM_EMAILS) {
  const phones = new Set();
  const accounts = new Set();
  const ids = new Set();

  // Search for email mentions in text
  const emailRe = new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  let m;
  const WINDOW = 800;
  
  emailRe.lastIndex = 0;
  while ((m = emailRe.exec(allText)) !== null) {
    const idx = m.index;
    const start = Math.max(0, idx - WINDOW);
    const end = Math.min(allText.length, idx + WINDOW);
    const ctx = allText.slice(start, end);

    // Phones
    const phoneRe = /(?:\+?\d[\d\s().-]{7,}\d)/g;
    let pm;
    while ((pm = phoneRe.exec(ctx)) !== null) {
      const n = normalizePhone(pm[0]);
      if (n) phones.add(n);
    }

    // IBAN / Account numbers (GE prefix)
    const ibanRe = /GE\d{2}[A-Z]{2}\d{16,}/g;
    let im;
    while ((im = ibanRe.exec(ctx)) !== null) {
      accounts.add(im[0]);
    }

    // 11-13 digit ID
    const idRe = /\b(\d{11,13})\b/g;
    let idm;
    while ((idm = idRe.exec(ctx)) !== null) {
      const id = idm[1];
      if (!/^0+$|20\d{2}|19\d{2}/.test(id) && ctx.toLowerCase().includes('id') || ctx.toLowerCase().includes('უ')) {
        ids.add(id);
      }
    }
  }

  results.push({
    email,
    phones: [...phones],
    accounts: [...accounts],
    ids: [...ids],
  });
}

console.log('=== SALES MANAGER CONTACT DETAILS ===\n');
for (const r of results) {
  console.log(`📧 ${r.email}`);
  if (r.phones.length) console.log(`   ☎️  ${r.phones.join(', ')}`);
  if (r.accounts.length) console.log(`   🏦 ${r.accounts.join(', ')}`);
  if (r.ids.length) console.log(`   🆔 ${r.ids.join(', ')}`);
  if (!r.phones.length && !r.accounts.length && !r.ids.length) {
    console.log(`   (no details found)`);
  }
  console.log('');
}

// Save
const outFile = path.join(__dirname, 'output/sm-contact-details.json');
fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf8');
console.log(`✅ Saved: ${outFile}`);
