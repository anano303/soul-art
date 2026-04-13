const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const categories = await db
    .collection('categories')
    .find({}, { projection: { name: 1, nameEn: 1 } })
    .toArray();
  const subcategories = await db
    .collection('subcategories')
    .find({}, { projection: { name: 1, nameEn: 1, category: 1, parentCategory: 1 } })
    .toArray();

  console.log('CATEGORIES');
  for (const category of categories) {
    console.log(String(category._id), '|', category.name || '', '|', category.nameEn || '');
  }

  console.log('SUBCATEGORIES');
  for (const subcategory of subcategories) {
    console.log(
      String(subcategory._id),
      '|',
      subcategory.name || '',
      '|',
      subcategory.nameEn || '',
      '|',
      String(subcategory.category || subcategory.parentCategory || '')
    );
  }

  const products = db.collection('products');
  const total = await products.countDocuments();
  const missingMain = await products.countDocuments({
    $or: [{ mainCategory: { $exists: false } }, { mainCategory: null }],
  });
  const missingSub = await products.countDocuments({
    $or: [{ subCategory: { $exists: false } }, { subCategory: null }],
  });
  const missingCategory = await products.countDocuments({
    $or: [{ category: { $exists: false } }, { category: null }, { category: '' }],
  });

  console.log('COUNTS', JSON.stringify({ total, missingMain, missingSub, missingCategory }));

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
