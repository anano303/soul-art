require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function checkTodayProducts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const today = new Date('2025-12-28');
  today.setHours(0, 0, 0, 0);
  
  const products = await db.collection('products').find({ 
    createdAt: { $gte: today } 
  }).toArray();

  console.log('=== ALL PRODUCTS CREATED TODAY ===');
  console.log('Total:', products.length);
  console.log('');

  products.forEach(p => {
    console.log(`${p.name} (${p._id})`);
    console.log(`  Brand: ${p.brand}`);
    console.log(`  Status: ${p.status}`);
    console.log(`  countInStock: ${p.countInStock}`);
    console.log(`  Created: ${p.createdAt}`);
    console.log('');
  });

  await client.close();
}

checkTodayProducts().catch(console.error);
