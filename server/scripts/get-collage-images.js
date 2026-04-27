require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const db = c.db();
  const cats = {
    paintings: '68768f6f0b55154655a8e882',
    handmade: '68768f850b55154655a8e88f',
  };
  for (const [name, catId] of Object.entries(cats)) {
    const prods = await db
      .collection('products')
      .find(
        {
          mainCategory: new ObjectId(catId),
          status: 'APPROVED',
          images: { $exists: true, $ne: [] },
        },
        { projection: { images: 1, name: 1 } },
      )
      .skip(0)
      .limit(30)
      .toArray();
    console.log('--- ' + name + ' ---');
    prods.forEach((p, i) => console.log(p.name, '->', p.images[0]));
  }
  await c.close();
})();
