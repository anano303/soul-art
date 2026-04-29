require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Find remaining cloudinary refs
  const users = await db.collection('users').find({
    $or: [
      { storeLogo: { $regex: 'cloudinary\\.com' } },
      { storeLogoPath: { $regex: 'cloudinary\\.com' } },
      { profileImagePath: { $regex: 'cloudinary\\.com' } },
    ]
  }).project({ _id: 1, name: 1, email: 1, storeLogo: 1, storeLogoPath: 1, profileImagePath: 1 }).toArray();
  console.log('Remaining users with cloudinary:', JSON.stringify(users, null, 2));

  const products = await db.collection('products').find({
    $or: [
      { brandLogo: { $regex: 'cloudinary\\.com' } },
      { images: { $elemMatch: { $regex: 'cloudinary' } } },
    ]
  }).project({ _id: 1, name: 1, brandLogo: 1, images: 1 }).toArray();
  console.log('Remaining products with cloudinary:', JSON.stringify(products, null, 2));

  // Also find Tamar Basilia to see what she has now
  const tamar = await db.collection('users').findOne(
    { email: 'tamarbasilia789@gmail.com' },
    { projection: { _id: 1, name: 1, storeLogo: 1, storeLogoPath: 1, profileImagePath: 1 } }
  );
  console.log('\nTamar Basilia current state:', JSON.stringify(tamar, null, 2));

  // Find her products first image to use as storeLogo
  const tamarProducts = await db.collection('products').find(
    { user: tamar._id }
  ).project({ _id: 1, name: 1, images: { $slice: 1 } }).limit(3).toArray();
  console.log('\nTamar products (first image):', JSON.stringify(tamarProducts, null, 2));

  await mongoose.disconnect();
})();
