require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const pattern = /xjkuavxbav9vvq7e2g2t/;

  const users = await db.collection('users').find({
    $or: [
      { storeLogo: pattern },
      { storeLogoPath: pattern },
      { profileImagePath: pattern },
    ]
  }).project({ _id: 1, name: 1, email: 1, storeLogo: 1, storeLogoPath: 1, profileImagePath: 1 }).toArray();
  console.log('Users:', JSON.stringify(users, null, 2));

  const products = await db.collection('products').find({
    $or: [
      { brandLogo: pattern },
      { images: { $elemMatch: { $regex: 'xjkuavxbav9vvq7e2g2t' } } },
    ]
  }).project({ _id: 1, name: 1, brandLogo: 1 }).toArray();
  console.log('Products:', JSON.stringify(products, null, 2));

  await mongoose.disconnect();
})();
