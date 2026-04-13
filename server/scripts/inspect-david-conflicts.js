const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const conflictUserId = new ObjectId('6910d3e4231e458e75999f8e');
  const productIds = [
    new ObjectId('6910d8e7231e458e7599a4e9'),
    new ObjectId('6910dce8231e458e7599a9d6'),
  ];

  const user = await db.collection('users').findOne(
    { _id: conflictUserId },
    { projection: { name: 1, storeName: 1, artistSlug: 1, email: 1 } },
  );
  const products = await db
    .collection('products')
    .find({ _id: { $in: productIds } }, { projection: { name: 1, user: 1, price: 1 } })
    .toArray();

  console.log('CONFLICT_USER', JSON.stringify(user));
  console.log('CONFLICT_PRODUCTS', JSON.stringify(products));

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
