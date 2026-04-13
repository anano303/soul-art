const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('test');

  // Fix Nino's artistSlug to match FB posts 
  const r1 = await db.collection('users').updateOne(
    { email: 'ninigudadze@gmail.com' },
    { $set: { artistSlug: 'ninogudadzeart' } }
  );
  console.log('Updated Nino artistSlug to ninogudadzeart:', r1.modifiedCount);

  // Verify
  const nino = await db.collection('users').findOne({ email: 'ninigudadze@gmail.com' });
  console.log('Nino now:', nino.artistSlug);

  const rati = await db.collection('users').findOne({ email: 'ratigogshelidze@gmail.com' });
  console.log('Rati:', rati.artistSlug);

  await client.close();
}

main().catch(console.error);
