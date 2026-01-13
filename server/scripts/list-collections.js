const { MongoClient } = require('mongodb');

async function listCollections() {
  const uri =
    process.env.MONGODB_URI ||
    'mongodb+srv://soulartani:Qazqaz111@soulart.b16ew.mongodb.net/soulart?retryWrites=true&w=majority&appName=SoulArt';
  console.log('Connecting to:', uri.substring(0, 50) + '...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    // ვცადოთ სხვადასხვა database-ს
    const dbs = ['soulart', 'nest', 'test', 'admin'];
    for (const dbName of dbs) {
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();
      if (collections.length > 0) {
        console.log(
          `\n📁 Database "${dbName}" has ${collections.length} collections:`,
        );
        collections.forEach((c) => console.log(' -', c.name));

        // sales-თან დაკავშირებული კოლექციები
        console.log('\n🔍 Sales related collections:');
        for (const coll of collections) {
          if (
            coll.name.toLowerCase().includes('sales') ||
            coll.name.toLowerCase().includes('tracking')
          ) {
            const count = await db.collection(coll.name).countDocuments();
            console.log(` ${coll.name}: ${count} documents`);

            // პირველი დოკუმენტი
            const sample = await db.collection(coll.name).findOne();
            if (sample) {
              console.log('   Sample keys:', Object.keys(sample).join(', '));
            }
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

listCollections();
