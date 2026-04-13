const { MongoClient, ObjectId } = require('mongodb');
const MONGODB_URI =
  'mongodb+srv://soulartgeorgia_db_user:hzO24rdfnjaT6kWI@soulart.gacy33l.mongodb.net/?appName=SoulArt';

const GIGA_ART_ID = '69d5f81b3b0ca78dc71c1e19';
const NATIA_ID = '6912f0db231e458e759a80c3';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const productsCol = db.collection('products');
  const categoriesCol = db.collection('categories');
  const subCategoriesCol = db.collection('subcategories');

  // 1. Check categories
  console.log('=== CATEGORIES ===');
  const cats = await categoriesCol.find().toArray();
  for (const c of cats) {
    console.log(`  ${c._id} | ${c.name} | ${c.nameEn || ''}`);
  }

  console.log('\n=== SUBCATEGORIES ===');
  const subs = await subCategoriesCol.find().toArray();
  for (const s of subs) {
    console.log(
      `  ${s._id} | ${s.name} | ${s.nameEn || ''} | parent: ${s.category || s.parentCategory}`,
    );
  }

  // 2. Count products per artist
  const gigaId = new ObjectId(GIGA_ART_ID);
  const natiaId = new ObjectId(NATIA_ID);

  const gigaCount = await productsCol.countDocuments({ user: gigaId });
  const natiaCount = await productsCol.countDocuments({ user: natiaId });
  console.log(`\n=== PRODUCTS ===`);
  console.log(`giga-art: ${gigaCount}`);
  console.log(`natia: ${natiaCount}`);

  // 3. Find duplicates for giga-art (same name + price + description hash)
  console.log('\n=== GIGA-ART DUPLICATES ===');
  const gigaProducts = await productsCol
    .find({ user: gigaId })
    .sort({ createdAt: 1 })
    .toArray();
  const gigaSeen = new Map();
  let gigaDupes = 0;
  const gigaDupeIds = [];
  for (const p of gigaProducts) {
    const key = `${p.name}|${p.price}|${p.description?.substring(0, 50)}|${JSON.stringify(p.dimensions || {})}`;
    if (gigaSeen.has(key)) {
      gigaDupes++;
      gigaDupeIds.push(p._id);
    } else {
      gigaSeen.set(key, p._id);
    }
  }
  console.log(
    `  Total: ${gigaProducts.length}, Unique: ${gigaSeen.size}, Duplicates: ${gigaDupes}`,
  );

  // 4. Find duplicates for natia
  console.log('\n=== NATIA DUPLICATES ===');
  const natiaProducts = await productsCol
    .find({ user: natiaId })
    .sort({ createdAt: 1 })
    .toArray();
  const natiaSeen = new Map();
  let natiaDupes = 0;
  const natiaDupeIds = [];
  for (const p of natiaProducts) {
    const key = `${p.name}|${p.price}|${p.description?.substring(0, 50)}|${JSON.stringify(p.dimensions || {})}`;
    if (natiaSeen.has(key)) {
      natiaDupes++;
      natiaDupeIds.push(p._id);
    } else {
      natiaSeen.set(key, p._id);
    }
  }
  console.log(
    `  Total: ${natiaProducts.length}, Unique: ${natiaSeen.size}, Duplicates: ${natiaDupes}`,
  );

  // 5. Delete duplicates
  const allDupeIds = [...gigaDupeIds, ...natiaDupeIds];
  if (allDupeIds.length > 0) {
    console.log(`\n🗑️  Deleting ${allDupeIds.length} duplicates...`);
    const delResult = await productsCol.deleteMany({
      _id: { $in: allDupeIds },
    });
    console.log(`   Deleted: ${delResult.deletedCount}`);
  } else {
    console.log('\n✅ No duplicates found!');
  }

  // 6. Set category to "ნახატები" and subcategory to "აბსტრაქცია"
  // Find the right category and subcategory IDs
  const paintings = cats.find(
    (c) =>
      c.name === 'ნახატები' || (c.nameEn || '').toLowerCase() === 'paintings',
  );
  let paintingsId = paintings ? paintings._id : null;
  console.log(
    '\nPaintings category:',
    paintingsId ? `${paintingsId} (${paintings.name})` : 'NOT FOUND',
  );

  let abstraction = subs.find(
    (s) =>
      s.name === 'აბსტრაქცია' ||
      (s.nameEn || '').toLowerCase() === 'abstraction',
  );
  let abstractionId = abstraction ? abstraction._id : null;
  console.log(
    'Abstraction subcategory:',
    abstractionId ? `${abstractionId} (${abstraction.name})` : 'NOT FOUND',
  );

  // Update all products for both artists
  const bothUserIds = [gigaId, natiaId];
  if (paintingsId) {
    const updateFields = {
      mainCategory: paintingsId,
      category: 'ნახატები',
    };
    if (abstractionId) {
      updateFields.subCategory = abstractionId;
    }
    const updateResult = await productsCol.updateMany(
      { user: { $in: bothUserIds } },
      { $set: updateFields },
    );
    console.log(
      `\n🎨 Updated ${updateResult.modifiedCount} products with category "ნახატები"${abstractionId ? ' / "აბსტრაქცია"' : ''}`,
    );
  }

  // Final counts
  const finalGiga = await productsCol.countDocuments({ user: gigaId });
  const finalNatia = await productsCol.countDocuments({ user: natiaId });
  console.log(`\n=== FINAL ===`);
  console.log(`giga-art: ${finalGiga} products`);
  console.log(`natia: ${finalNatia} products`);

  await client.close();
}
main().catch(console.error);
