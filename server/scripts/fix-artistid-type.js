require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function fixArtistIdType() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  // Update artistId to be ObjectId
  const result = await db.collection('portfolioposts').updateOne(
    { _id: new ObjectId('695135d6b805101b1d88c43f') },
    [
      {
        $set: {
          artistId: { $toObjectId: "$artistId" }
        }
      }
    ]
  );

  console.log('Updated:', result.modifiedCount);

  // Verify
  const post = await db.collection('portfolioposts').findOne({ _id: new ObjectId('695135d6b805101b1d88c43f') });
  console.log('artistId type now:', typeof post.artistId, post.artistId);
  console.log('Is ObjectId:', post.artistId instanceof ObjectId);

  await client.close();
}

fixArtistIdType().catch(console.error);
