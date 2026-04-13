const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function sanitizeMongoUri(uri) {
  return String(uri || '')
    .replace(/appName(?=&|$)/g, 'appName=SoulArt')
    .replace(/appName=&/g, 'appName=SoulArt&')
    .replace(/\?&/, '?')
    .replace(/&&/g, '&');
}

const MONGODB_URI = sanitizeMongoUri(process.env.MONGODB_URI || process.env.DATABASE_URL);
const APPLY = process.argv.includes('--apply');

// Confirmed 1-to-1 matches (email -> slug, no conflicts)
const CONFIRMED_MATCHES = [
  { email: 'natiachijavadze@yahoo.com',            slug: 'natia-chijavadze',     displayName: 'Natia Chijavadze' },
  { email: 'qeti.chekurishvili@gmail.com',          slug: 'ketos-art',            displayName: 'Keto Chekurishvili' },
  { email: 'mumladzeliza22@gmail.com',              slug: 'liza-mumladze',        displayName: 'Liza Mumladze' },
  { email: 'pochkhidzenini288@gmail.com',           slug: 'nini-pochkhidze',      displayName: 'Nini Pochkhidze' },
  { email: 'keti.abulashvili.art@gmail.com',        slug: 'keti-abulashvili',     displayName: 'Keti Abulashvili' },
  { email: 'ratigogshelidze@gmail.com',             slug: 'ratigogshelidze',      displayName: 'Rati Gogshelidze' },
  { email: 'tornike.xosikuridze@icloud.com',       slug: 'tokesi',               displayName: 'Tornike Xosikuridze' },
  { email: 'vano.kravelidze@gmail.com',             slug: 'ioane-kravelidze',     displayName: 'Vano Kravelidze' },
  { email: 'tomalapatina@gmail.com',                slug: 'tomalapatinagmailcom', displayName: 'Toma Lapatina' },
  { email: 'natia.lobjanidze286@hum.tsu.edu.ge',   slug: 'natialobzhanidze',     displayName: 'Natia Lobzhanidze' },
  { email: 'marinpura.studio@gmail.com',            slug: 'marin-pura',          displayName: 'Marin Pura' },
  { email: 'ninofutkaradze98@gmail.com',            slug: 'plushiflora',          displayName: 'Nino Futkaradze' },
  { email: 'asanidze122@gmail.com',                 slug: 'mintnikusha',          displayName: 'Nikoloz Asanidze' },
  { email: 'cisiaomiadze@yahoo.com',                slug: 'omia',                 displayName: 'Kakhaber Omiadze' },
];

(async () => {
  console.log(`\n=== Promote Verified Email->Slug Matches to Sellers ===`);
  console.log(`Mode: ${APPLY ? '🔴 APPLY' : '🟢 DRY RUN'}\n`);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const usersCol = db.collection('users');
  const productsCol = db.collection('products');

  const results = [];

  for (const match of CONFIRMED_MATCHES) {
    console.log(`\n--- ${match.email} -> @${match.slug} ---`);

    // 1. Find the user by email
    const user = await usersCol.findOne({ email: match.email.toLowerCase() });
    if (!user) {
      console.log(`  ❌ User not found: ${match.email}`);
      results.push({ ...match, status: 'user-not-found' });
      continue;
    }
    if (user.role === 'seller') {
      console.log(`  ⚠️  Already seller: ${match.email} (slug: ${user.artistSlug})`);
      results.push({ ...match, status: 'already-seller' });
      continue;
    }

    // 2. Check if slug is taken by another seller
    const existingSeller = await usersCol.findOne({ artistSlug: match.slug, role: 'seller' });
    if (existingSeller && String(existingSeller._id) !== String(user._id)) {
      console.log(`  ⚠️  Slug @${match.slug} already taken by ${existingSeller.email}`);
      results.push({ ...match, status: 'slug-taken', takenBy: existingSeller.email });
      continue;
    }

    // 3. Find products with this slug
    const products = await productsCol.find({ artistSlug: match.slug }).toArray();
    console.log(`  Products found: ${products.length}`);

    if (products.length > 0) {
      // Show product details
      for (const p of products.slice(0, 5)) {
        console.log(`    📦 "${p.title}" | cat: ${p.category || '-'} | subcat: ${p.subcategory || '-'} | sizes: ${JSON.stringify(p.sizes || p.dimensions || '-')}`);
      }
      if (products.length > 5) console.log(`    ... and ${products.length - 5} more`);
    }

    // 4. Determine categories from products
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    const subcategories = [...new Set(products.map(p => p.subcategory).filter(Boolean))];

    // 5. Upgrade user to seller
    const nameParts = match.displayName.split(' ');
    const firstName = nameParts[0] || match.displayName;
    const lastName = nameParts.slice(1).join(' ') || '';
    const now = new Date();

    const updateFields = {
      role: 'seller',
      artistSlug: match.slug,
      storeName: match.displayName,
      ownerFirstName: firstName,
      ownerLastName: lastName,
      sellerApprovedAt: now,
      updatedAt: now,
    };

    console.log(`  ✅ Will promote: role=seller, slug=@${match.slug}, store="${match.displayName}"`);
    console.log(`     Categories: [${categories.join(', ')}]`);
    console.log(`     Subcategories: [${subcategories.join(', ')}]`);

    if (APPLY) {
      // Update user
      await usersCol.updateOne({ _id: user._id }, { $set: updateFields });

      // Update products to point to this user
      if (products.length > 0) {
        const updateResult = await productsCol.updateMany(
          { artistSlug: match.slug },
          { $set: { userId: user._id, sellerEmail: match.email } }
        );
        console.log(`  📦 Updated ${updateResult.modifiedCount} products -> userId=${user._id}`);
      }

      results.push({ ...match, status: 'promoted', products: products.length });
    } else {
      results.push({ ...match, status: 'would-promote', products: products.length });
    }
  }

  // Summary
  console.log(`\n\n=== Summary ===`);
  const promoted = results.filter(r => r.status === 'promoted' || r.status === 'would-promote');
  const skipped = results.filter(r => r.status !== 'promoted' && r.status !== 'would-promote');
  console.log(`Promoted/Would promote: ${promoted.length}`);
  promoted.forEach(r => console.log(`  ✅ ${r.email} -> @${r.slug} (${r.products} products)`));
  if (skipped.length > 0) {
    console.log(`Skipped: ${skipped.length}`);
    skipped.forEach(r => console.log(`  ⚠️  ${r.email}: ${r.status} ${r.takenBy ? '(by ' + r.takenBy + ')' : ''}`));
  }

  if (!APPLY) {
    console.log(`\n🟡 DRY RUN. Run with --apply to execute.`);
  }

  await client.close();
})();
