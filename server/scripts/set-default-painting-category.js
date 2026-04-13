const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PAINTINGS_CATEGORY_ID = '68768f6f0b55154655a8e882';
const ABSTRACTION_SUBCATEGORY_ID = '68768f990b55154655a8e89d';

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const products = db.collection('products');

  const filter = {
    $or: [
      { mainCategory: { $exists: false } },
      { mainCategory: null },
      { subCategory: { $exists: false } },
      { subCategory: null },
    ],
  };

  const beforeCount = await products.countDocuments(filter);
  console.log('matching_before:', beforeCount);

  const result = await products.updateMany(filter, {
    $set: {
      category: 'ნახატები',
      mainCategory: new ObjectId(PAINTINGS_CATEGORY_ID),
      subCategory: new ObjectId(ABSTRACTION_SUBCATEGORY_ID),
      mainCategoryEn: 'Painting',
      subCategoryEn: 'Abstraction',
    },
  });

  const afterCount = await products.countDocuments(filter);
  console.log('matched:', result.matchedCount);
  console.log('modified:', result.modifiedCount);
  console.log('matching_after:', afterCount);

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
