#!/usr/bin/env node
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const usersCol = db.collection('users');

  const users = await usersCol
    .find(
      {
        $or: [
          { name: /უცნობ|unknown/i },
          { storeName: /უცნობ|unknown/i },
          { fullName: /უცნობ|unknown/i },
          { username: /უცნობ|unknown/i },
          { email: /არ არის|unknown|none|null|not set/i },
        ],
      },
      {
        projection: {
          _id: 1,
          name: 1,
          storeName: 1,
          fullName: 1,
          username: 1,
          email: 1,
          role: 1,
          artistSlug: 1,
        },
      },
    )
    .limit(300)
    .toArray();

  console.log('CANDIDATES', users.length);
  for (const u of users) {
    console.log(JSON.stringify(u));
  }

  const missingEmailNonSeller = await usersCol
    .find(
      {
        $and: [
          {
            $or: [
              { email: { $exists: false } },
              { email: null },
              { email: '' },
              { email: /არ არის|not set|unknown|none|null/i },
            ],
          },
          {
            $or: [{ role: { $exists: false } }, { role: null }, { role: '' }, { role: { $ne: 'seller' } }],
          },
        ],
      },
      {
        projection: {
          _id: 1,
          name: 1,
          storeName: 1,
          fullName: 1,
          username: 1,
          email: 1,
          role: 1,
          artistSlug: 1,
        },
      },
    )
    .limit(200)
    .toArray();

  console.log('MISSING_EMAIL_NON_SELLER', missingEmailNonSeller.length);
  for (const u of missingEmailNonSeller) {
    console.log(JSON.stringify(u));
  }

  await client.close();
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
