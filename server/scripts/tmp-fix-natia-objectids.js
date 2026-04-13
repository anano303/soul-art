const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const uri = (process.env.MONGODB_URI || process.env.DATABASE_URL)
  .replace(/appName(?=&|$)/g,'appName=SoulArt')
  .replace(/appName=&/g,'appName=SoulArt&');

(async()=>{
  const c = new MongoClient(uri); await c.connect(); const db = c.db();
  
  const prodId = new ObjectId('69d93017053077307dd18318');
  const prod = await db.collection('products').findOne({ _id: prodId });
  
  console.log('Before fix:');
  console.log('  user type:', typeof prod.user, prod.user);
  console.log('  mainCategory type:', typeof prod.mainCategory, prod.mainCategory);
  console.log('  subCategory type:', typeof prod.subCategory, prod.subCategory);
  console.log('  materialsEn:', prod.materialsEn);
  
  // Fix: convert string IDs to ObjectId and translate materials
  const result = await db.collection('products').updateOne(
    { _id: prodId },
    { $set: {
      user: new ObjectId(prod.user),
      mainCategory: new ObjectId(prod.mainCategory),
      subCategory: new ObjectId(prod.subCategory),
      materialsEn: ['Sheet', 'Charcoal pencil', 'With frame'],
      brand: '',
    }}
  );
  
  console.log('\nUpdated:', result.modifiedCount);
  
  // Verify
  const after = await db.collection('products').findOne({ _id: prodId });
  console.log('\nAfter fix:');
  console.log('  user type:', typeof after.user, after.user instanceof ObjectId, after.user);
  console.log('  mainCategory type:', typeof after.mainCategory, after.mainCategory instanceof ObjectId, after.mainCategory);
  console.log('  subCategory type:', typeof after.subCategory, after.subCategory instanceof ObjectId, after.subCategory);
  console.log('  materialsEn:', after.materialsEn);
  
  await c.close();
})();
