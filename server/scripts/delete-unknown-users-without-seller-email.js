#!/usr/bin/env node
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function buildQuery() {
  return {
    $and: [
      {
        $or: [
          { name: /უცნობ|unknown/i },
          { storeName: /უცნობ|unknown/i },
          { fullName: /უცნობ|unknown/i },
          { username: /უცნობ|unknown/i },
        ],
      },
      {
        $or: [
          { role: { $exists: false } },
          { role: null },
          { role: '' },
          { role: { $ne: 'seller' } },
        ],
      },
      {
        $or: [
          { email: { $exists: false } },
          { email: null },
          { email: '' },
        ],
      },
    ],
  };
}

function buildUnknownNullOwnerProductsQuery() {
  return {
    $and: [
      {
        $or: [{ user: null }, { user: { $exists: false } }],
      },
      {
        $or: [
          { name: /უცნობ|unknown/i },
          { brand: /უცნობ|unknown/i },
          { description: /უცნობი მომხმარებელი|unknown user/i },
        ],
      },
    ],
  };
}

async function main() {
  const doDelete = process.argv.includes('--delete');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const usersCol = db.collection('users');
  const productsCol = db.collection('products');

  const query = buildQuery();
  const unknownNullOwnerProductsQuery = buildUnknownNullOwnerProductsQuery();

  const users = await usersCol
    .find(query, {
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
    })
    .toArray();

  const userIds = users.map((u) => u._id);
  const linkedProducts = userIds.length
    ? await productsCol.countDocuments({ user: { $in: userIds } })
    : 0;

  const unknownNullOwnerProducts = await productsCol
    .find(unknownNullOwnerProductsQuery, {
      projection: { _id: 1, name: 1, brand: 1, user: 1, price: 1 },
    })
    .toArray();

  console.log('MATCHED_USERS', users.length);
  for (const u of users.slice(0, 50)) {
    console.log(JSON.stringify(u));
  }
  if (users.length > 50) {
    console.log(`...and ${users.length - 50} more`);
  }
  console.log('LINKED_PRODUCTS', linkedProducts);
  console.log('UNKNOWN_NULL_OWNER_PRODUCTS', unknownNullOwnerProducts.length);
  for (const p of unknownNullOwnerProducts.slice(0, 50)) {
    console.log(JSON.stringify(p));
  }
  if (unknownNullOwnerProducts.length > 50) {
    console.log(`...and ${unknownNullOwnerProducts.length - 50} more unknown null-owner products`);
  }

  if (!doDelete) {
    console.log('DRY_RUN_ONLY true');
    await client.close();
    return;
  }

  let deletedProducts = 0;
  if (userIds.length) {
    const pRes = await productsCol.deleteMany({ user: { $in: userIds } });
    deletedProducts = pRes.deletedCount || 0;
  }

  const unknownNullOwnerDeleteRes = await productsCol.deleteMany(
    unknownNullOwnerProductsQuery,
  );

  const uRes = await usersCol.deleteMany({ _id: { $in: userIds } });

  console.log('DELETED_PRODUCTS', deletedProducts);
  console.log('DELETED_UNKNOWN_NULL_OWNER_PRODUCTS', unknownNullOwnerDeleteRes.deletedCount || 0);
  console.log('DELETED_USERS', uRes.deletedCount || 0);

  await client.close();
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
