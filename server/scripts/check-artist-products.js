require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function checkArtistProducts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const artistId = new ObjectId('6912f0db231e458e759a80c3');
  
  // Get all products by this artist
  const products = await db.collection('products').find({ 
    user: artistId 
  }).sort({ createdAt: -1 }).toArray();

  console.log('=== ARTIST PRODUCTS ===');
  console.log('Total products:', products.length);
  console.log('');

  for (const p of products) {
    console.log(`Name: ${p.name}`);
    console.log(`  ID: ${p._id}`);
    console.log(`  Status: ${p.status}`);
    console.log(`  countInStock: ${p.countInStock}`);
    console.log(`  variants: ${JSON.stringify(p.variants?.map(v => ({ stock: v.stock })))}`);
    console.log(`  Created: ${p.createdAt}`);
    console.log(`  Updated: ${p.updatedAt}`);
    
    // Check portfolio post
    const portfolioPost = await db.collection('portfolioposts').findOne({ 
      productId: p._id 
    });
    console.log(`  Has Portfolio Post: ${portfolioPost ? 'YES' : 'NO'}`);
    console.log('');
  }

  await client.close();
}

checkArtistProducts().catch(console.error);
