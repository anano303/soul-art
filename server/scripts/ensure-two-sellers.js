#!/usr/bin/env node
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const users = db.collection('users');

  // 1. Ensure mali.gogoladze seller with baruaruart slug
  const maliEmail = 'mali.gogoladze@gmail.com';
  const maliSlug = 'httpswwwinstagramcombaruaruart';
  const maliExisting = await users.findOne(
    { email: new RegExp('^' + maliEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
    { projection: { _id: 1, email: 1, role: 1, artistSlug: 1 } },
  );

  if (!maliExisting) {
    const now = new Date();
    const res = await users.insertOne({
      name: 'მარიამ გოგოლაძე',
      email: maliEmail,
      role: 'seller',
      artistSlug: maliSlug,
      storeName: 'მარიამ გოგოლაძე',
      ownerFirstName: 'მარიამ',
      ownerLastName: 'გოგოლაძე',
      sellerApprovedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    console.log('CREATED mali:', String(res.insertedId));
  } else {
    await users.updateOne(
      { _id: maliExisting._id },
      { $set: { role: 'seller', artistSlug: maliSlug, updatedAt: new Date() } },
    );
    console.log('UPDATED mali:', String(maliExisting._id));
  }

  // 2. Fix nuca slug to the correct one
  const nucaSlug = 'httpswwwfacebookcomshare14vtvvdw7mpmibex';
  const nucaRes = await users.updateOne(
    { email: /kobakhidze\.nuca1510/i },
    { $set: { artistSlug: nucaSlug, updatedAt: new Date() } },
  );
  console.log('NUCA slug fix:', nucaRes.modifiedCount > 0 ? 'OK' : 'already correct or not found');

  // Verify
  const v1 = await users.findOne({ artistSlug: maliSlug }, { projection: { _id: 1, email: 1, artistSlug: 1, role: 1 } });
  const v2 = await users.findOne({ artistSlug: nucaSlug }, { projection: { _id: 1, email: 1, artistSlug: 1, role: 1 } });
  console.log('verify mali:', JSON.stringify(v1));
  console.log('verify nuca:', JSON.stringify(v2));

  await client.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
