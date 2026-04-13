'use strict';
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const DB_NAME = 'test';

async function main() {
  const client = await MongoClient.connect(uri);
  const db = client.db(DB_NAME);
  const roles = ['seller', 'sales_manager', 'seller_sales_manager', 'admin', 'auction_admin', 'blogger'];

  const all = await db.collection('users').find(
    { role: { $in: roles } },
    { projection: { _id: 1, email: 1, name: 1, role: 1, phoneNumber: 1, createdAt: 1 } }
  ).toArray();

  const noPhone = all.filter(u => !u.phoneNumber || !String(u.phoneNumber).trim());
  const hasPhone = all.filter(u => u.phoneNumber && String(u.phoneNumber).trim());

  console.log(`Total non-user roles: ${all.length}`);
  console.log(`  With phone:    ${hasPhone.length}`);
  console.log(`  Without phone: ${noPhone.length}`);

  console.log('\nWITHOUT PHONE:');
  noPhone.forEach(u => {
    console.log(`  [${(u.role || '').padEnd(22)}] ${(u.email || '').padEnd(38)} name=${u.name || ''}`);
  });

  console.log('\nWITH PHONE:');
  hasPhone.forEach(u => {
    console.log(`  [${(u.role || '').padEnd(22)}] ${(u.email || '').padEnd(38)} phone=${u.phoneNumber}`);
  });

  await client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
