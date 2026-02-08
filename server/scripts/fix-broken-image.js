const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function fixBrokenImage() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    const brokenImagePattern = 'xe5klmc2hht4dxuusmul';
    const userId = '67d9b0f9e75387766202b31a';

    // ვპოულობთ მომხმარებელს
    const user = await db
      .collection('users')
      .findOne({ _id: new ObjectId(userId) });
    if (user) {
      console.log('Found user:', user.email);
      console.log('Current storeLogoPath:', user.storeLogoPath);

      // ვასუფთავებთ გატეხილ URL-ს
      const result = await db
        .collection('users')
        .updateOne(
          { _id: new ObjectId(userId) },
          { $set: { storeLogoPath: '' } },
        );

      console.log('Updated:', result.modifiedCount, 'document(s)');
      console.log('storeLogoPath cleared successfully!');
    } else {
      console.log('User not found');
    }
  } finally {
    await client.close();
  }
}

fixBrokenImage().catch(console.error);
