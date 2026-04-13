const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const artists = [
  { slug: 'giga-art', userId: '69d5f81b3b0ca78dc71c1e19' },
  { slug: 'natiajanturidze', userId: '6912f0db231e458e759a80c3' },
  { slug: 'tornikeotiashvili', userId: '68e8fe72f10079410087add2' },
  { slug: 'tamarbasilia', userId: '68e9e11bf100794100883461' },
  { slug: 'dimitri', userId: '6912114a231e458e759a39a3' },
  { slug: 'maka30', userId: '68448304d53e41a14d1a6a2b' },
  { slug: 'gogajashiashviliart', userId: '690bb2d1303c8bd68b45a047' },
  { slug: 'david', userId: '68e78dc86d8ca03daa70fb65' },
];

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const products = db.collection('products');

  for (const artist of artists) {
    const user = new ObjectId(artist.userId);
    const total = await products.countDocuments({ user });
    const missingMain = await products.countDocuments({
      user,
      $or: [{ mainCategory: { $exists: false } }, { mainCategory: null }],
    });
    const missingSub = await products.countDocuments({
      user,
      $or: [{ subCategory: { $exists: false } }, { subCategory: null }],
    });
    const wrongCategory = await products.countDocuments({
      user,
      $or: [{ category: { $exists: false } }, { category: null }, { category: '' }],
    });

    console.log(
      JSON.stringify({
        slug: artist.slug,
        total,
        missingMain,
        missingSub,
        wrongCategory,
      }),
    );
  }

  const globalMissing = await products.countDocuments({
    $or: [
      { mainCategory: { $exists: false } },
      { mainCategory: null },
      { subCategory: { $exists: false } },
      { subCategory: null },
    ],
  });
  console.log('GLOBAL_MISSING', globalMissing);

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
