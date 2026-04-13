const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const uri = (process.env.MONGODB_URI || process.env.DATABASE_URL)
  .replace(/appName(?=&|$)/g,'appName=SoulArt')
  .replace(/appName=&/g,'appName=SoulArt&');

(async()=>{
  const c = new MongoClient(uri); await c.connect(); const db = c.db();
  const result = await db.collection('products').updateOne(
    { _id: new ObjectId('69d93017053077307dd18318') },
    { 
      $set: {
        countInStock: 1,
        variants: [],
        rating: 0,
        numReviews: 0,
        reviews: [],
        viewCount: 0,
        colors: [],
        colorsEn: [],
        sizes: [],
        ageGroups: [],
        brand: '',
        hideFromStore: false,
        discountPercentage: 0,
        useArtistDefaultDiscount: false,
        referralDiscountPercent: 0,
        deliveryType: 'both',
      },
      $unset: { stock: '' }
    }
  );
  console.log('Updated:', result.modifiedCount);
  await c.close();
})();
