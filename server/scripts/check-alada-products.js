'use strict';
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function main() {
  const c = await MongoClient.connect(process.env.MONGODB_URI);
  const db = c.db('test');

  const user = await db.collection('users').findOne(
    { email: 'alada777@gmail.com' },
    { projection: { _id: 1, email: 1, role: 1, artistSlug: 1, name: 1 } }
  );

  if (!user) { console.log('User not found'); await c.close(); return; }
  console.log('User:', JSON.stringify(user, null, 2));

  const products = await db.collection('products').find(
    { seller: new ObjectId(user._id) },
    { projection: { _id: 1, name: 1, slug: 1, price: 1, status: 1, stock: 1, createdAt: 1 } }
  ).toArray();

  console.log(`\nProducts for alada777: ${products.length}`);
  for (const p of products) {
    console.log(` - ${p._id} | ${p.name} | price:${p.price} | status:${p.status} | stock:${p.stock}`);
  }

  await c.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
