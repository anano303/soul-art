'use strict';
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const DB_NAME = 'test';

async function main() {
  const client = await MongoClient.connect(uri);
  const db = client.db(DB_NAME);

  const roles = ['sales_manager', 'seller_sales_manager'];

  const sms = await db.collection('users').find(
    { role: { $in: roles } },
    { projection: { _id: 1, email: 1, name: 1, role: 1, phoneNumber: 1, referralCode: 1, salesRefCode: 1, salesCommissionBalance: 1, createdAt: 1 } }
  ).toArray();

  console.log(`sales_manager / seller_sales_manager total: ${sms.length}\n`);
  sms.forEach(u => {
    console.log(`  [${(u.role || '').padEnd(25)}] ${(u.email || '').padEnd(42)}`);
    console.log(`       name=${(u.name || '').padEnd(30)} | phone=${(u.phoneNumber || 'MISSING').padEnd(16)} | salesRefCode=${u.salesRefCode || 'MISSING'} | balance=${u.salesCommissionBalance || 0}`);
  });

  // Also show referral stats (commissions)
  console.log('\n--- Referral collection sample ---');
  const refs = await db.collection('referrals').find({}).toArray();
  console.log(`Referrals docs: ${refs.length}`);
  refs.forEach(r => console.log('  ', JSON.stringify(r)));

  // Sales commissions
  console.log('\n--- Sales commissions ---');
  const comms = await db.collection('salescommissions').find({}).toArray();
  console.log(`SalesCommissions docs: ${comms.length}`);
  comms.slice(0, 20).forEach(r => console.log('  ', JSON.stringify(r)));

  // Sales tracking
  console.log('\n--- Sales trackings ---');
  const tracks = await db.collection('salestrackings').find({}).toArray();
  console.log(`SalesTrackings docs: ${tracks.length}`);
  tracks.slice(0, 20).forEach(r => console.log('  ', JSON.stringify(r)));

  // Referral balance transactions
  console.log('\n--- Referral balance transactions ---');
  const rbt = await db.collection('referralbalancetransactions').find({}).toArray();
  console.log(`ReferralBalanceTransactions docs: ${rbt.length}`);
  rbt.slice(0, 20).forEach(r => console.log('  ', JSON.stringify(r)));

  await client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
