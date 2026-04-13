require('dotenv').config();
const { MongoClient } = require('mongodb');

const DRY_RUN = !process.argv.includes('--apply');

(async () => {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db('test');

  if (DRY_RUN) console.log('=== DRY RUN (use --apply to execute) ===\n');

  // Find all sellers with artistSlug but no slug, who have products
  const sellers = await db.collection('users').find({
    role: 'seller',
    artistSlug: { $exists: true, $ne: null, $ne: '' },
    $or: [{ slug: null }, { slug: { $exists: false } }]
  }).toArray();

  let fixedUsers = 0;
  let fixedApproval = 0;
  let fixedDelivery = 0;

  for (const seller of sellers) {
    const products = await db.collection('products').find({ user: seller._id }).toArray();
    if (products.length === 0) continue;

    // 1. Fix user: slug = artistSlug, + sellerApprovedAt if missing
    const userUpdate = { slug: seller.artistSlug };
    if (!seller.sellerApprovedAt) {
      userUpdate.sellerApprovedAt = new Date();
      fixedApproval++;
    }

    if (!DRY_RUN) {
      await db.collection('users').updateOne({ _id: seller._id }, { $set: userUpdate });
    }
    fixedUsers++;

    console.log(`${DRY_RUN ? '[DRY]' : '[OK]'} ${seller.email} | slug: ${seller.artistSlug} | ${!seller.sellerApprovedAt ? '+approval' : ''} | ${products.length} products`);
  }

  // Also fix the 1 seller without artistSlug (ketusiam@gmail.com)
  const noArtistSlug = await db.collection('users').findOne({ email: 'ketusiam@gmail.com' });
  if (noArtistSlug && !noArtistSlug.slug) {
    const slugFromStore = 'ketevanmerkviladze';
    if (!DRY_RUN) {
      await db.collection('users').updateOne({ _id: noArtistSlug._id }, {
        $set: { slug: slugFromStore, artistSlug: slugFromStore, sellerApprovedAt: new Date() }
      });
    }
    fixedUsers++;
    console.log(`${DRY_RUN ? '[DRY]' : '[OK]'} ketusiam@gmail.com | slug: ${slugFromStore} (generated) | +approval`);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Users fixed (slug = artistSlug): ${fixedUsers}`);
  console.log(`Users given sellerApprovedAt: ${fixedApproval}`);
  console.log(DRY_RUN ? '\nRun with --apply to execute!' : '\nAll changes applied!');

  await client.close();
})();
