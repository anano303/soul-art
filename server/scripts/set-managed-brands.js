require('dotenv').config();
const { MongoClient } = require('mongodb');

async function setManagedBrands() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const email = 'gigaartshop@gmail.com';

  // Find the user
  const user = await db.collection('users').findOne({ email });
  if (!user) {
    console.error('User not found:', email);
    process.exit(1);
  }
  console.log(
    'Found user:',
    user.name,
    '| ID:',
    user._id,
    '| Role:',
    user.role,
  );
  console.log('Current managedBrands:', user.managedBrands || '(none)');

  // Find all unique brand names in products
  const allBrands = await db.collection('products').distinct('brand');
  console.log('\n=== ALL UNIQUE BRANDS ===');
  allBrands
    .filter(Boolean)
    .sort()
    .forEach((b) => console.log(' -', b));

  // Find brands matching GSKKART or Giga Art Shop (case insensitive)
  const matchingBrands = allBrands.filter(
    (b) =>
      b &&
      (b.toLowerCase().includes('gskkart') ||
        b.toLowerCase().includes('giga') ||
        b.toLowerCase().includes('gigaart')),
  );
  console.log('\n=== MATCHING BRANDS ===');
  matchingBrands.forEach((b) => console.log(' -', b));

  // Find products with these brands and check their owners
  for (const brand of matchingBrands) {
    const products = await db.collection('products').find({ brand }).toArray();
    const ownerIds = [...new Set(products.map((p) => p.user?.toString()))];
    console.log(
      `\nBrand "${brand}": ${products.length} products, owners: ${ownerIds.join(', ')}`,
    );

    for (const ownerId of ownerIds) {
      const owner = await db
        .collection('users')
        .findOne({
          _id: require('mongodb').ObjectId.createFromHexString(ownerId),
        });
      console.log(`  Owner: ${owner?.email} (${owner?.name})`);
    }
  }

  // Set managedBrands for the user
  if (matchingBrands.length > 0) {
    const result = await db
      .collection('users')
      .updateOne({ email }, { $set: { managedBrands: matchingBrands } });
    console.log('\n=== UPDATE RESULT ===');
    console.log('Modified:', result.modifiedCount);
    console.log('managedBrands set to:', matchingBrands);
  } else {
    console.log(
      '\nNo matching brands found. Please check brand names manually.',
    );
  }

  await client.close();
}

setManagedBrands().catch(console.error);
