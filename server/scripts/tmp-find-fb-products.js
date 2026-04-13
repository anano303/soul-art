const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('test');

  // Check how FB products are stored
  const sample = await db.collection('products').findOne({ fbPostId: { $exists: true } });
  if (sample) {
    const keys = Object.keys(sample);
    console.log('Sample FB product keys:', keys.join(', '));
    console.log('fbPostId:', sample.fbPostId);
    console.log('user:', sample.user);
    for (const k of ['fbPostSlug', 'authorSlug', 'socialMediaSlug', 'sourceSlug', 'slug']) {
      if (sample[k]) console.log(k + ':', sample[k]);
    }
  }

  // Try finding by fbPostId patterns from the scan data
  // ninogudadzeart sample post IDs: 122166269462832848, etc..
  const ninoPostIds = [
    '542501458957000_122166269462832848',
    '542501458957000_122166269456832848',
    '542501458957000_122166269060832848',
    '542501458957000_122166269066832848',
    '542501458957000_122166268688832848',
  ];
  const ratiPostIds = [
    '542501458957000_122172169280832848',
  ];

  // Search by fbPostId
  for (const [name, ids] of [['ninogudadzeart', ninoPostIds], ['ratigogshelidze', ratiPostIds]]) {
    const byId = await db.collection('products').find({ fbPostId: { $in: ids } }).toArray();
    console.log(`\n${name}: ${byId.length} products by fbPostId`);
    if (byId.length > 0) {
      byId.forEach(p => console.log(`  - ${p._id} "${p.name}" user=${p.user} fbPostId=${p.fbPostId}`));
    }
  }

  // Also search for any product with known slugs in various fields
  const slugs = ['ninogudadzeart', 'ratigogshelidze'];
  for (const slug of slugs) {
    const results = await db.collection('products').find({
      $or: [
        { fbPostSlug: slug },
        { authorSlug: slug },
        { socialMediaSlug: slug },
        { sourceSlug: slug },
      ]
    }).toArray();
    console.log(`\n${slug}: ${results.length} products by slug fields`);
  }

  // Check who owns the ninogudadzeart products (find by user ninogudadzeart)
  const ninoUser = await db.collection('users').findOne({ slug: 'ninogudadzeart' });
  if (ninoUser) {
    console.log('\nninogudadzeart user found:', ninoUser._id, ninoUser.name);
    const prods = await db.collection('products').find({ user: ninoUser._id }).toArray();
    console.log(`Products owned by ninogudadzeart user: ${prods.length}`);
  } else {
    console.log('\nNo user with slug ninogudadzeart');
  }

  const ratiUser = await db.collection('users').findOne({ slug: 'ratigogshelidze' });
  if (ratiUser) {
    console.log('\nratigogshelidze user found:', ratiUser._id, ratiUser.name);
    const prods = await db.collection('products').find({ user: ratiUser._id }).toArray();
    console.log(`Products owned by ratigogshelidze user: ${prods.length}`);
  } else {
    console.log('\nNo user with slug ratigogshelidze');
  }

  // Check ninogudadzeart user in the SLUG_ALIASES
  // The ninogudadzeart products may be assigned to giga-art or some placeholder
  // Let's find products with these fbPostIds regardless of owner
  const allNinoIds = [
    '542501458957000_122166269462832848',
    '542501458957000_122166269456832848',
    '542501458957000_122166269060832848',
    '542501458957000_122166269066832848',
    '542501458957000_122166268688832848',
  ];
  
  // Search all products for any containing these post IDs in any field
  const allProducts = await db.collection('products').find({}).project({ fbPostId: 1, user: 1, name: 1 }).toArray();
  const fbProducts = allProducts.filter(p => p.fbPostId);
  console.log(`\nTotal products with fbPostId: ${fbProducts.length}`);
  
  // Group by user
  const byUser = {};
  fbProducts.forEach(p => {
    const uid = p.user.toString();
    if (!byUser[uid]) byUser[uid] = [];
    byUser[uid].push(p);
  });
  
  for (const [uid, prods] of Object.entries(byUser)) {
    const user = await db.collection('users').findOne({ _id: new ObjectId(uid) });
    console.log(`User ${user?.slug || uid} (${user?.name}): ${prods.length} FB products`);
  }

  await client.close();
}

main().catch(console.error);
