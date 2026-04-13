const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const users = db.collection('users');
  const products = db.collection('products');

  const soulart = await users.findOne({ artistSlug: 'soulart' }, { projection: { _id: 1, artistSlug: 1 } });
  const soulart1 = await users.findOne({ artistSlug: 'soulart1' }, { projection: { _id: 1, artistSlug: 1 } });

  const soulartCount = soulart ? await products.countDocuments({ user: soulart._id }) : 0;
  const soulart1Count = soulart1 ? await products.countDocuments({ user: soulart1._id }) : 0;

  const duplicateIds = await products.aggregate([
    { $group: { _id: '$_id', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: 'duplicates' },
  ]).toArray();

  console.log(JSON.stringify({
    soulartCount,
    soulart1Count,
    duplicateProductIds: duplicateIds[0]?.duplicates || 0,
  }));

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
