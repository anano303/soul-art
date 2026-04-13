const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const db = c.db('test');

  // Set slug for Nino
  await db.collection('users').updateOne(
    { email: 'ninigudadze@gmail.com' },
    { $set: { slug: 'ninogudadzeart' } }
  );

  // Verify both
  for (const email of ['ninigudadze@gmail.com', 'ratigogshelidze@gmail.com']) {
    const u = await db.collection('users').findOne({ email });
    const prods = await db.collection('products').find({ user: u._id }).project({ name: 1, brand: 1 }).toArray();
    console.log(`${u.name} (${u.email})`);
    console.log(`  role: ${u.role}, slug: ${u.slug}, storeName: ${u.storeName}, approved: ${!!u.sellerApprovedAt}`);
    console.log(`  Products (${prods.length}):`);
    prods.forEach(p => console.log(`    - "${p.name}" brand="${p.brand}"`));
  }

  await c.close();
}
main().catch(console.error);
