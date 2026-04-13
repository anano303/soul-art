require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db('test');

  // Find all sellers with products but missing slug
  const sellers = await db.collection('users').find({ 
    role: 'seller',
    $or: [{ slug: null }, { slug: { $exists: false } }]
  }).toArray();

  console.log(`Sellers missing slug: ${sellers.length}\n`);
  console.log('Checking artistSlug for each:\n');

  let hasArtistSlug = 0;
  let noArtistSlug = 0;

  for (const s of sellers) {
    const products = await db.collection('products').find({ user: s._id }).toArray();
    if (products.length === 0) continue;
    
    if (s.artistSlug) {
      hasArtistSlug++;
      console.log(`✅ ${s.email} | storeName: "${s.storeName}" | artistSlug: "${s.artistSlug}" | products: ${products.length} | approved: ${!!s.sellerApprovedAt}`);
    } else {
      noArtistSlug++;
      console.log(`❌ ${s.email} | storeName: "${s.storeName}" | NO artistSlug | products: ${products.length} | approved: ${!!s.sellerApprovedAt}`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Has artistSlug (can use as slug): ${hasArtistSlug}`);
  console.log(`No artistSlug at all: ${noArtistSlug}`);

  await client.close();
})();
