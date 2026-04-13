'use strict';
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function main() {
  const c = await MongoClient.connect(process.env.MONGODB_URI);
  const db = c.db('test');

  const alada = await db.collection('users').findOne(
    { email: /alada777/i },
    { projection: { email: 1, role: 1, artistSlug: 1, phoneNumber: 1, accountNumber: 1, identificationNumber: 1, name: 1 } }
  );
  console.log('alada777:', alada ? JSON.stringify(alada, null, 2) : 'NOT FOUND');

  const sellers = await db.collection('users').find(
    { role: { $in: ['seller', 'seller_sales_manager'] } },
    { projection: { email: 1, role: 1, artistSlug: 1, phoneNumber: 1, accountNumber: 1, identificationNumber: 1, name: 1, ownerFirstName: 1, ownerLastName: 1 } }
  ).toArray();

  console.log('\nAll sellers (' + sellers.length + '):');
  for (const s of sellers) {
    const miss = [];
    if (!s.phoneNumber) miss.push('phone');
    if (!s.accountNumber) miss.push('account');
    if (!s.identificationNumber) miss.push('id');
    console.log(` - ${s.email} | slug: ${s.artistSlug || '--'} | name: ${s.name || s.ownerFirstName || '--'} | missing: ${miss.join(',') || 'complete'}`);
  }

  await c.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
