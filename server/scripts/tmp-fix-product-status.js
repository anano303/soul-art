const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const uri = (process.env.MONGODB_URI || process.env.DATABASE_URL)
  .replace(/appName(?=&|$)/g,'appName=SoulArt')
  .replace(/appName=&/g,'appName=SoulArt&');

(async()=>{
  const c = new MongoClient(uri); await c.connect(); const db = c.db();
  
  // Fix natia's product: status must be APPROVED, not 'active'
  const result = await db.collection('products').updateOne(
    { _id: new ObjectId('69d93017053077307dd18318') },
    { $set: {
      status: 'APPROVED',
      firstApprovedAt: new Date(),
    }}
  );
  console.log('Fixed status to APPROVED:', result.modifiedCount);
  
  // Also fix ALL products created by our scripts that have status 'active' instead of 'APPROVED'
  const badProducts = await db.collection('products').find({ status: 'active' }).toArray();
  console.log('Products with status "active" (wrong):', badProducts.length);
  
  if (badProducts.length > 0) {
    const fixResult = await db.collection('products').updateMany(
      { status: 'active' },
      { $set: { status: 'APPROVED', firstApprovedAt: new Date() } }
    );
    console.log('Fixed all to APPROVED:', fixResult.modifiedCount);
    for (const p of badProducts) {
      console.log('  Fixed:', p._id, p.name, p.artistSlug);
    }
  }
  
  await c.close();
})();
