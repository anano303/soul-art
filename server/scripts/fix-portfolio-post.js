require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function fixPortfolioPost() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  // Fix the portfolio post we created - artistId must be ObjectId not string
  const result = await db.collection('portfolioposts').updateOne(
    { _id: new ObjectId('695135d6b805101b1d88c43f') },
    {
      $set: {
        artistId: new ObjectId('6912f0db231e458e759a80c3'),
        images: [
          {
            url: 'https://res.cloudinary.com/dmvh7vwpu/image/upload/q_auto,f_auto,w_1024/v1766577112/ecommerce/t6g4sgqwhobkpniufnhi.jpg',
            order: 0,
            sourceProductImageId: null,
            storageProvider: null,
            metadata: {
              source: 'product-image',
              productId: '694bd3d92cfb62c494528ca7',
            },
          },
        ],
        caption:
          'ნამუშევარი წარმოადგენს ზღაპრულ-სიმბოლურ კომპოზიციას, რომელშიც ცენტრალურ ფიგურად წარმოდგენილია ბავშვური სახის ანგელოზი, ზამთრის ღამეში.',
        tags: [],
        isFeatured: false,
        isSold: true,
        hideBuyButton: false,
        likesCount: 0,
        commentsCount: 0,
        publishedAt: new Date(),
        archivedAt: null,
      },
      $unset: {
        user: '',
        title: '',
        titleEn: '',
        description: '',
        descriptionEn: '',
        likes: '',
        views: '',
      },
    },
  );

  console.log('Portfolio post fixed:', result.modifiedCount);

  // Verify
  const post = await db
    .collection('portfolioposts')
    .findOne({ _id: new ObjectId('695135d6b805101b1d88c43f') });
  console.log('\nUpdated portfolio post:');
  console.log(JSON.stringify(post, null, 2));

  await client.close();
}

fixPortfolioPost().catch(console.error);
