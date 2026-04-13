const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('test');

  // Check artistSlug field on users
  const ninoUser = await db.collection('users').findOne({ email: 'ninigudadze@gmail.com' });
  if (ninoUser) {
    console.log('Nino Gudadze user fields:', JSON.stringify({
      _id: ninoUser._id,
      name: ninoUser.name,
      slug: ninoUser.slug,
      artistSlug: ninoUser.artistSlug,
      email: ninoUser.email,
      role: ninoUser.role,
    }, null, 2));
  }

  const ratiUser = await db.collection('users').findOne({ email: 'ratigogshelidze@gmail.com' });
  if (ratiUser) {
    console.log('\nRati user fields:', JSON.stringify({
      _id: ratiUser._id,
      name: ratiUser.name,
      slug: ratiUser.slug,
      artistSlug: ratiUser.artistSlug,
      email: ratiUser.email,
      role: ratiUser.role,
    }, null, 2));
  }

  // Check what artistSlug looks like for a known working user (ARTEKO)
  const artekoUser = await db.collection('users').findOne({ email: 'arteko.ek@gmail.com' });
  if (artekoUser) {
    console.log('\nARTEKO user (reference):', JSON.stringify({
      _id: artekoUser._id,
      slug: artekoUser.slug,
      artistSlug: artekoUser.artistSlug,
    }, null, 2));
  }

  // Set artistSlug for both users
  if (ninoUser && !ninoUser.artistSlug) {
    const r = await db.collection('users').updateOne(
      { _id: ninoUser._id },
      { $set: { artistSlug: 'ninogudadzeart' } }
    );
    console.log('\nSet artistSlug for Nino Gudadze:', r.modifiedCount);
  }

  if (ratiUser && !ratiUser.artistSlug) {
    const r = await db.collection('users').updateOne(
      { _id: ratiUser._id },
      { $set: { artistSlug: 'ratigogshelidze' } }
    );
    console.log('Set artistSlug for Rati:', r.modifiedCount);
  }

  await client.close();
}

main().catch(console.error);
