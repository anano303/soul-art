'use strict';
/**
 * Find:
 * 1. Auction Admins (role: auction_admin) mentioned in chats
 * 2. Sellers (role: seller) mentioned in chats
 * 3. Which users have discount permissions (campaignDiscountChoice, defaultReferralDiscount)
 * 4. Order/commission data if any
 *
 * Compare with DB to identify what's missing
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const CHAT_DIR = 'C:\\Users\\a.beroshvili\\AppData\\Roaming\\Code\\User\\workspaceStorage\\a8560dbf6b8949e67e43fa5dbceea9f5\\chatSessions';
const DB_NAME = 'test';

function collectJsonFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...collectJsonFiles(full));
    else if (e.isFile() && e.name.toLowerCase().endsWith('.json')) files.push(full);
  }
  return files;
}

function extractRawText(jsonFile) {
  try {
    return fs.readFileSync(jsonFile, 'utf8');
  } catch (_) {
    return '';
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;

  console.log('🔍 Scanning for auction admins, sellers, discounts, and orders...\n');

  const files = collectJsonFiles(CHAT_DIR);
  let allText = '';
  for (const f of files) {
    allText += '\n' + extractRawText(f);
  }

  // Regular expressions for different entity types
  const auctionAdminRe = /(?:აუქ|auction[_\s]?admin|ფასი|ღირებულ)[^\\n.]*?([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})/gi;
  const discountRe = /(?:ფასდაკლ|discount|campaign)[^\\n.]*?([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})[^\\n.]*?(\d{1,2}%)?/gi;
  const orderRe = /(?:შეკვეთ|order|გაყიდვა|sales)[^\\n.]*?([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})[^\\n.]*?(\d+)/gi;

  const emails = new Set();
  const discountUsers = new Map();
  const orderData = new Map();

  let m;

  // Auction admins
  auctionAdminRe.lastIndex = 0;
  while ((m = auctionAdminRe.exec(allText)) !== null) {
    const email = m[1].toLowerCase();
    if (!/example|noreply|mongodb|x\.ai|cluster0/.test(email)) {
      emails.add(email);
    }
  }

  // Discounts
  discountRe.lastIndex = 0;
  while ((m = discountRe.exec(allText)) !== null) {
    const email = m[1].toLowerCase();
    const discount = m[2] ? parseInt(m[2]) : null;
    if (!/example|noreply|mongodb|x\.ai|cluster0/.test(email)) {
      if (!discountUsers.has(email)) discountUsers.set(email, []);
      if (discount) discountUsers.get(email).push(discount);
    }
  }

  // Orders
  orderRe.lastIndex = 0;
  while ((m = orderRe.exec(allText)) !== null) {
    const email = m[1].toLowerCase();
    const count = parseInt(m[2]) || 1;
    if (!/example|noreply|mongodb|x\.ai|cluster0/.test(email)) {
      if (!orderData.has(email)) orderData.set(email, { count: 0 });
      orderData.get(email).count += count;
    }
  }

  // Connect to DB
  const client = await MongoClient.connect(uri);
  const db = client.db(DB_NAME);
  const users = await db.collection('users').find({}, {
    projection: {
      email: 1,
      role: 1,
      campaignDiscountChoice: 1,
      defaultReferralDiscount: 1,
      createdAt: 1,
    },
  }).toArray();

  const usersByEmail = new Map(users.map(u => [u.email.toLowerCase(), u]));

  console.log(`📊 Scanning Results:`);
  console.log(`   Emails found: ${emails.size}`);
  console.log(`   With discount mentions: ${discountUsers.size}`);
  console.log(`   With order mentions: ${orderData.size}\n`);

  // Check which are missing from DB
  const missing = [...emails].filter(e => !usersByEmail.has(e));
  const existing = [...emails].filter(e => usersByEmail.has(e));

  console.log(`✅ Already in DB: ${existing.length}`);
  existing.slice(0, 10).forEach(e => {
    const u = usersByEmail.get(e);
    console.log(`   ${e} | role=${u.role} | discount=${u.defaultReferralDiscount || 0}%`);
  });
  if (existing.length > 10) console.log(`   ... and ${existing.length - 10} more`);

  console.log(`\n❌ NOT in DB: ${missing.length}`);
  missing.slice(0, 20).forEach(e => {
    const opts = [];
    if (discountUsers.has(e)) opts.push(`discount:${Math.max(...discountUsers.get(e))}%`);
    if (orderData.has(e)) opts.push(`orders:${orderData.get(e).count}`);
    console.log(`   ${e}${opts.length ? ' | ' + opts.join(' | ') : ''}`);
  });

  console.log(`\n📋 Discount permissions found:`);
  const withDiscount = [...discountUsers.entries()]
    .sort((a, b) => Math.max(...b[1]) - Math.max(...a[1]))
    .slice(0, 20);
  
  withDiscount.forEach(([email, percents]) => {
    const u = usersByEmail.get(email);
    const maxPercent = Math.max(...percents);
    console.log(`   ${email.padEnd(40)} | max: ${maxPercent}% | current DB: ${u?.defaultReferralDiscount || 0}%`);
  });

  // Orders / commissions
  console.log(`\n📦 Order data found:`);
  const withOrders = [...orderData.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20);
  
  withOrders.forEach(([email, data]) => {
    const u = usersByEmail.get(email);
    console.log(`   ${email.padEnd(40)} | orders: ${data.count} | role: ${u?.role || 'N/A'}`);
  });

  // Save outputs
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  fs.writeFileSync(
    path.join(


, 'found-entities.json'),
    JSON.stringify(
      {
        allEmails: [...emails],
        discounts: [...discountUsers.entries()],
        orders: [...orderData.entries()],
        missingFromDb: missing,
      },
      null,
      2
    ),
    'utf8'
  );

  await client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
