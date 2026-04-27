require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const db = c.db();

  const catIds = [
    '68768f6f0b55154655a8e882', // ნახატები
    '68768f850b55154655a8e88f', // ხელნაკეთი
  ];

  for (const catId of catIds) {
    const p = await db
      .collection('products')
      .findOne(
        {
          mainCategory: new ObjectId(catId),
          status: 'APPROVED',
          images: { $exists: true, $ne: [] },
        },
        { projection: { name: 1, images: 1 } },
      );
    console.log(catId, '->', p?.name, '->', p?.images?.[0]);
  }

  await c.close();
})();
