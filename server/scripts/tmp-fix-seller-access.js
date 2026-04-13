const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const db = c.db('test');

  // Fix Rati - set storeName, slug, sellerApprovedAt
  await db.collection('users').updateOne(
    { email: 'ratigogshelidze@gmail.com' },
    { $set: { storeName: 'რატი205', sellerApprovedAt: new Date(), slug: 'ratigogshelidze' } }
  );
  console.log('Rati: storeName + slug + sellerApprovedAt set');

  // Fix Nino - set sellerApprovedAt  
  await db.collection('users').updateOne(
    { email: 'ninigudadze@gmail.com' },
    { $set: { sellerApprovedAt: new Date() } }
  );
  console.log('Nino: sellerApprovedAt set');

  // Also update brand on their products to match storeName
  const nino = await db.collection('users').findOne({ email: 'ninigudadze@gmail.com' });
  const rati = await db.collection('users').findOne({ email: 'ratigogshelidze@gmail.com' });

  const r1 = await db.collection('products').updateMany(
    { user: nino._id },
    { $set: { brand: nino.storeName } }
  );
  console.log(`Nino products brand updated: ${r1.modifiedCount}`);

  const r2 = await db.collection('products').updateMany(
    { user: rati._id },
    { $set: { brand: 'რატი205' } }
  );
  console.log(`Rati products brand updated: ${r2.modifiedCount}`);

  // Verify
  for (const email of ['ninigudadze@gmail.com', 'ratigogshelidze@gmail.com']) {
    const u = await db.collection('users').findOne({ email });
    console.log(`\n${u.name}: role=${u.role}, storeName="${u.storeName}", slug=${u.slug}, approved=${u.sellerApprovedAt}`);
  }

  await c.close();
}
main().catch(console.error);
