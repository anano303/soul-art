#!/usr/bin/env node
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SAMPLE_PRODUCT_ID = '69ca6b0fd390e279b3e587f5';

function isInvalidEmail(value) {
  if (value === null || value === undefined) return true;
  const email = String(value).trim().toLowerCase();
  if (!email) return true;
  if (email === 'null' || email === 'none' || email === 'unknown') return true;
  if (email.includes('არ არის') || email.includes('not set')) return true;
  return false;
}

async function main() {
  const doDelete = process.argv.includes('--delete');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const productsCol = db.collection('products');
  const usersCol = db.collection('users');

  const sampleProduct = await productsCol.findOne(
    { _id: new ObjectId(SAMPLE_PRODUCT_ID) },
    { projection: { _id: 1, name: 1, user: 1, brand: 1, createdAt: 1 } },
  );

  console.log('SAMPLE_PRODUCT', JSON.stringify(sampleProduct));

  const candidates = await productsCol
    .find(
      {
        $or: [{ user: null }, { user: { $exists: false } }],
      },
      {
        projection: { _id: 1, name: 1, user: 1, brand: 1, price: 1 },
      },
    )
    .toArray();

  const referencedUserProducts = await productsCol
    .find(
      {
        user: { $type: 'objectId' },
      },
      {
        projection: { _id: 1, name: 1, user: 1, brand: 1, price: 1 },
      },
    )
    .toArray();

  const userIds = [...new Set(referencedUserProducts.map((p) => String(p.user)))].map(
    (id) => new ObjectId(id),
  );
  const users = await usersCol
    .find({ _id: { $in: userIds } }, { projection: { _id: 1, email: 1, role: 1 } })
    .toArray();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const invalidOwnerProducts = [];
  for (const p of referencedUserProducts) {
    const owner = userMap.get(String(p.user));
    const ownerMissing = !owner;
    const ownerNotSeller = owner ? String(owner.role || '').toLowerCase() !== 'seller' : true;
    const ownerEmailInvalid = owner ? isInvalidEmail(owner.email) : true;

    if (ownerMissing || ownerNotSeller || ownerEmailInvalid) {
      invalidOwnerProducts.push({
        ...p,
        owner: owner || null,
      });
    }
  }

  const allBadProducts = [...candidates, ...invalidOwnerProducts];
  const dedupMap = new Map();
  for (const p of allBadProducts) dedupMap.set(String(p._id), p);
  const badProducts = [...dedupMap.values()];

  console.log('NULL_OR_MISSING_OWNER_PRODUCTS', candidates.length);
  console.log('INVALID_OWNER_PRODUCTS', invalidOwnerProducts.length);
  console.log('TOTAL_BAD_PRODUCTS', badProducts.length);
  for (const p of badProducts.slice(0, 40)) {
    console.log(JSON.stringify(p));
  }
  if (badProducts.length > 40) {
    console.log(`...and ${badProducts.length - 40} more`);
  }

  if (!doDelete) {
    console.log('DRY_RUN_ONLY true');
    await client.close();
    return;
  }

  const badIds = badProducts.map((p) => p._id);
  const deleteRes = badIds.length
    ? await productsCol.deleteMany({ _id: { $in: badIds } })
    : { deletedCount: 0 };

  console.log('DELETED_PRODUCTS', deleteRes.deletedCount || 0);

  await client.close();
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
