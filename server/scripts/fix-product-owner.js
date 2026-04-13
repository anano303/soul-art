const { MongoClient, ObjectId } = require('mongodb');
const MONGODB_URI =
  'mongodb+srv://soulartgeorgia_db_user:hzO24rdfnjaT6kWI@soulart.gacy33l.mongodb.net/?appName=SoulArt';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  const oldUserId = new ObjectId('6911b233231e458e759a0bde'); // gskkart
  const newUserId = new ObjectId('69d5f81b3b0ca78dc71c1e19'); // giga-art

  // Move all products from gskkart to giga-art
  const result = await db
    .collection('products')
    .updateMany(
      { user: oldUserId },
      { $set: { user: newUserId, updatedAt: new Date() } },
    );

  console.log('Updated:', result.modifiedCount, 'products');

  // Verify
  const count = await db
    .collection('products')
    .countDocuments({ user: newUserId, status: 'APPROVED' });
  console.log('giga-art now has', count, 'approved products');

  await client.close();
}
main().catch(console.error);
