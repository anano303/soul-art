const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const uri = (process.env.MONGODB_URI || process.env.DATABASE_URL)
  .replace(/appName(?=&|$)/g,'appName=SoulArt')
  .replace(/appName=&/g,'appName=SoulArt&');

(async()=>{
  const c = new MongoClient(uri); await c.connect(); const db = c.db();
  
  // Fix natia product deliveryType
  const r1 = await db.collection('products').updateOne(
    { _id: new ObjectId('69d93017053077307dd18318') },
    { $set: { deliveryType: 'SoulArt' } }
  );
  console.log('Fixed natia deliveryType:', r1.modifiedCount);
  
  // Fix ALL products with wrong deliveryType
  const r2 = await db.collection('products').updateMany(
    { deliveryType: 'both' },
    { $set: { deliveryType: 'SoulArt' } }
  );
  console.log('Fixed all deliveryType=both:', r2.modifiedCount);
  
  // Verify
  const p = await db.collection('products').findOne({ _id: new ObjectId('69d93017053077307dd18318') });
  console.log('\nFinal product state:');
  console.log('  status:', p.status);
  console.log('  deliveryType:', p.deliveryType);
  console.log('  countInStock:', p.countInStock);
  console.log('  hideFromStore:', p.hideFromStore);
  console.log('  brand:', JSON.stringify(p.brand));
  console.log('  images:', p.images?.length);
  
  await c.close();
})();
