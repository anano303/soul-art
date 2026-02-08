const { MongoClient } = require('mongodb');
require('dotenv').config();

async function findBrokenImage() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to:', uri ? 'MongoDB Atlas' : 'No URI found');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    const searchPattern = 'xe5klmc2hht4dxuusmul';

    // ყველა კოლექციის მოძებნა
    const collections = await db.listCollections().toArray();
    console.log('Searching in', collections.length, 'collections...\n');

    for (const coll of collections) {
      const collection = db.collection(coll.name);

      // ვეძებთ ყველა ველში რომელიც შეიცავს ამ სტრინგს
      const docs = await collection
        .find({
          $where: function () {
            return JSON.stringify(this).includes('xe5klmc2hht4dxuusmul');
          },
        })
        .toArray();

      if (docs.length > 0) {
        console.log(`Found in ${coll.name}:`, docs.length, 'documents');
        docs.forEach((d) => {
          console.log('  ID:', d._id.toString());
          // ვეძებთ კონკრეტულ ველებს
          const jsonStr = JSON.stringify(d);
          if (jsonStr.includes('xe5klmc2hht4dxuusmul')) {
            // ვპოულობთ რომელი ველია
            for (const [key, value] of Object.entries(d)) {
              if (
                typeof value === 'string' &&
                value.includes('xe5klmc2hht4dxuusmul')
              ) {
                console.log(`    ${key}:`, value);
              }
            }
          }
        });
      }
    }
  } finally {
    await client.close();
  }
}

findBrokenImage().catch(console.error);
