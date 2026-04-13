const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const uri = (process.env.MONGODB_URI || process.env.DATABASE_URL)
  .replace(/appName(?=&|$)/g,'appName=SoulArt')
  .replace(/appName=&/g,'appName=SoulArt&');

(async()=>{
  const c = new MongoClient(uri); await c.connect(); const db = c.db();
  
  // Find a working product (one that shows on site)
  const working = await db.collection('products').findOne(
    { status: 'active', countInStock: { $gt: 0 } },
    { sort: { createdAt: -1 } }
  );
  const broken = await db.collection('products').findOne({ _id: new ObjectId('69d93017053077307dd18318') });
  
  console.log('=== WORKING PRODUCT ===');
  console.log(JSON.stringify(working, null, 2));
  
  console.log('\n=== BROKEN PRODUCT ===');
  console.log(JSON.stringify(broken, null, 2));
  
  await c.close();
})();
