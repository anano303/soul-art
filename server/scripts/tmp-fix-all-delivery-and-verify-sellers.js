#!/usr/bin/env node
/**
 * 1) Fix deliveryType on ALL products where it's missing or wrong (set to 'SoulArt')
 * 2) Verify every product has a valid `user` reference (seller can edit)
 *
 * Usage:
 *   node scripts/tmp-fix-all-delivery-and-verify-sellers.js          # dry-run
 *   node scripts/tmp-fix-all-delivery-and-verify-sellers.js --apply  # apply changes
 */
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const uri = process.env.MONGODB_URI;

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  // ── 1. Fix deliveryType ──────────────────────────────────────────
  console.log('=== DELIVERY TYPE AUDIT ===\n');

  const allProducts = await db.collection('products').find({}, {
    projection: { name: 1, deliveryType: 1, user: 1, status: 1 }
  }).toArray();

  console.log(`Total products: ${allProducts.length}`);

  const needsFix = allProducts.filter(p =>
    !p.deliveryType || p.deliveryType === '' || p.deliveryType === 'both'
  );
  const correctSoulArt = allProducts.filter(p => p.deliveryType === 'SoulArt');
  const seller = allProducts.filter(p => p.deliveryType === 'SELLER');
  const other = allProducts.filter(p =>
    p.deliveryType && p.deliveryType !== 'SoulArt' && p.deliveryType !== 'SELLER' && p.deliveryType !== 'both' && p.deliveryType !== ''
  );

  console.log(`  deliveryType = 'SoulArt': ${correctSoulArt.length}`);
  console.log(`  deliveryType = 'SELLER':  ${seller.length}`);
  console.log(`  deliveryType missing/empty/both (NEEDS FIX): ${needsFix.length}`);
  if (other.length) {
    console.log(`  Other values: ${other.length}`);
    other.forEach(p => console.log(`    ${p._id} → "${p.deliveryType}"`));
  }

  if (needsFix.length) {
    console.log(`\nProducts needing deliveryType fix:`);
    needsFix.forEach(p => console.log(`  ${p._id} "${p.name}" current="${p.deliveryType || '(missing)'}"`));

    if (APPLY) {
      const ids = needsFix.map(p => p._id);
      const res = await db.collection('products').updateMany(
        { _id: { $in: ids } },
        { $set: { deliveryType: 'SoulArt' } }
      );
      console.log(`\n✅ Fixed deliveryType → 'SoulArt' on ${res.modifiedCount} products`);
    } else {
      console.log(`\n[DRY RUN] Would fix ${needsFix.length} products. Run with --apply to fix.`);
    }
  } else {
    console.log('\n✅ All products have correct deliveryType');
  }

  // ── 2. Verify seller linkage ─────────────────────────────────────
  console.log('\n\n=== SELLER LINKAGE AUDIT ===\n');

  const noUser = allProducts.filter(p => !p.user);
  console.log(`Products without user reference: ${noUser.length}`);
  if (noUser.length) {
    noUser.forEach(p => console.log(`  ${p._id} "${p.name}"`));
  }

  // Check that every product.user actually exists as a user with role seller
  const userIds = [...new Set(allProducts.filter(p => p.user).map(p => p.user.toString()))];
  const users = await db.collection('users').find(
    { _id: { $in: userIds.map(id => new ObjectId(id)) } },
    { projection: { _id: 1, name: 1, email: 1, role: 1, artistSlug: 1 } }
  ).toArray();

  const userMap = new Map(users.map(u => [u._id.toString(), u]));

  const orphaned = [];
  const nonSeller = [];

  for (const p of allProducts) {
    if (!p.user) continue;
    const uid = p.user.toString();
    const u = userMap.get(uid);
    if (!u) {
      orphaned.push({ product: p, userId: uid });
    } else if (u.role !== 'seller' && u.role !== 'admin') {
      nonSeller.push({ product: p, user: u });
    }
  }

  console.log(`Products pointing to non-existent user: ${orphaned.length}`);
  if (orphaned.length) {
    orphaned.forEach(o => console.log(`  ${o.product._id} "${o.product.name}" → user ${o.userId} (NOT FOUND)`));
  }

  console.log(`Products owned by non-seller users: ${nonSeller.length}`);
  if (nonSeller.length) {
    nonSeller.forEach(o => console.log(`  ${o.product._id} "${o.product.name}" → ${o.user.email} role=${o.user.role}`));
  }

  // Summary of sellers and their product counts
  const sellerProducts = new Map();
  for (const p of allProducts) {
    if (!p.user) continue;
    const uid = p.user.toString();
    if (!sellerProducts.has(uid)) sellerProducts.set(uid, []);
    sellerProducts.get(uid).push(p);
  }

  console.log(`\nSeller → Product count summary (${sellerProducts.size} sellers):`);
  for (const [uid, prods] of sellerProducts) {
    const u = userMap.get(uid);
    const label = u ? `${u.name || u.email} (${u.role}, slug=${u.artistSlug || 'none'})` : `UNKNOWN USER ${uid}`;
    console.log(`  ${label}: ${prods.length} products`);
  }

  if (!noUser.length && !orphaned.length && !nonSeller.length) {
    console.log('\n✅ All products properly linked to seller/admin users');
  }

  await client.close();
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
