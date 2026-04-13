'use strict';
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'soulart';

async function main() {
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  const sellerRoles = ['seller', 'sales_manager', 'seller_sales_manager', 'admin', 'auction_admin', 'blogger'];

  // All sellers
  const allSellers = await db.collection('users').find(
    { role: { $in: sellerRoles } },
    { projection: { _id: 1, email: 1, name: 1, role: 1, phoneNumber: 1, createdAt: 1 } }
  ).toArray();

  const withPhone = allSellers.filter(u => u.phoneNumber && String(u.phoneNumber).trim());
  const withoutPhone = allSellers.filter(u => !u.phoneNumber || !String(u.phoneNumber).trim());

  console.log(`Total sellers/non-user roles: ${allSellers.length}`);
  console.log(`  With phone:    ${withPhone.length}`);
  console.log(`  Without phone: ${withoutPhone.length}`);

  if (withoutPhone.length) {
    console.log('\nSellers WITHOUT phone:');
    withoutPhone.forEach(u => {
      console.log(`  ${u.role.padEnd(22)} | ${(u.email || '').padEnd(35)} | ${u.name || ''}`);
    });
  }

  await client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
