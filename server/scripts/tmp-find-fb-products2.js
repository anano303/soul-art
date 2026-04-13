const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('test');

  // Check product schema
  const p = await db.collection('products').findOne();
  console.log('Product keys:', Object.keys(p).sort().join(', '));

  // Check for FB-related fields in any product
  const allKeys = new Set();
  const sample = await db.collection('products').find().limit(50).toArray();
  sample.forEach(s => Object.keys(s).forEach(k => allKeys.add(k)));
  console.log('\nAll product field keys:', [...allKeys].sort().join(', '));

  // Nino Gudadze user - check by email
  const ninoU = await db.collection('users').findOne({ email: 'ninigudadze@gmail.com' });
  if (ninoU) {
    console.log('\nNino Gudadze user:', ninoU._id.toString(), 'slug:', ninoU.slug, 'name:', ninoU.name);
    const prods = await db.collection('products').countDocuments({ user: ninoU._id });
    console.log('Products:', prods);
  }

  // Rati user - check by email
  const ratiU = await db.collection('users').findOne({ email: 'ratigogshelidze@gmail.com' });
  if (ratiU) {
    console.log('\nRati user:', ratiU._id.toString(), 'slug:', ratiU.slug, 'name:', ratiU.name);
    const prods = await db.collection('products').countDocuments({ user: ratiU._id });
    console.log('Products:', prods);
  }

  // The FB posts were scanned from FB page - these are posts that mention artists
  // Products from FB are imported with the scan-fb-posts-for-slug script
  // Look at how existing assigned products use the slug system
  // Check the SLUG_ALIASES in users.service.ts
  
  // Find products that have socialMedia or fbPage fields
  const fbFields = ['socialMediaPost', 'facebookPostId', 'fbPostId', 'source', 'fbPagePostId', 'importSource'];
  for (const field of fbFields) {
    const count = await db.collection('products').countDocuments({ [field]: { $exists: true } });
    if (count > 0) console.log(`\nField ${field}: ${count} products`);
  }

  // Check if products have image URLs from FB
  const fbImg = await db.collection('products').findOne({ 'images.0': /facebook|fbcdn/ });
  if (fbImg) {
    console.log('\nFound product with FB image:', fbImg._id, 'user:', fbImg.user, 'images:', fbImg.images[0].substring(0, 80));
  }

  // The FB posts scan result shows posts from the FB page that contain artist products
  // These are likely already imported as products belonging to giga-art or the page admin
  // We need to find which products correspond to which FB posts
  // Let's look at giga-art products
  const gigaArt = await db.collection('users').findOne({ email: 'gskkart@gmail.com' });
  const gigaArt2 = await db.collection('users').findOne({ email: 'gigaartshop@gmail.com' });
  
  if (gigaArt) {
    const count1 = await db.collection('products').countDocuments({ user: gigaArt._id });
    console.log(`\ngskkart user ${gigaArt._id}: ${count1} products`);
  }
  if (gigaArt2) {
    const count2 = await db.collection('products').countDocuments({ user: gigaArt2._id });
    console.log(`gigaartshop user ${gigaArt2._id}: ${count2} products`);
  }

  // Look at Tamar Aladashvili (admin) products
  const admin = await db.collection('users').findOne({ email: 'admin@soulart.ge' });
  if (admin) {
    const count = await db.collection('products').countDocuments({ user: admin._id });
    console.log(`\nadmin user ${admin._id}: ${count} products`);
  }

  // Total products
  const total = await db.collection('products').countDocuments();
  console.log(`\nTotal products: ${total}`);

  // Products grouped by user (top 20)
  const byUser = await db.collection('products').aggregate([
    { $group: { _id: '$user', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
    { $unwind: '$u' },
    { $project: { count: 1, 'u.slug': 1, 'u.name': 1, 'u.email': 1 } },
  ]).toArray();
  
  console.log('\n=== Top 20 users by product count ===');
  byUser.forEach(r => console.log(`${r.u.slug || r.u.name} (${r.u.email}): ${r.count} products`));

  await client.close();
}

main().catch(console.error);
