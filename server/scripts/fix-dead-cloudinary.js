require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const deadUrl = 'xjkuavxbav9vvq7e2g2t';

  // Fix user storeLogoPath & profileImagePath
  const userResult = await db.collection('users').updateMany(
    { $or: [
      { storeLogoPath: { $regex: deadUrl } },
      { profileImagePath: { $regex: deadUrl } },
    ]},
    { $set: { storeLogoPath: null, storeLogo: null } }
  );
  console.log('Users fixed:', userResult.modifiedCount);

  // Also fix profileImagePath separately (may be different URL)
  const userResult2 = await db.collection('users').updateMany(
    { profileImagePath: { $regex: 'cloudinary\\.com' } },
    { $set: { profileImagePath: null } }
  );
  console.log('Users profileImagePath cleared:', userResult2.modifiedCount);

  // Fix product brandLogo
  const prodResult = await db.collection('products').updateMany(
    { brandLogo: { $regex: deadUrl } },
    { $set: { brandLogo: null } }
  );
  console.log('Products brandLogo cleared:', prodResult.modifiedCount);

  // Check any remaining cloudinary references
  const remainingUsers = await db.collection('users').countDocuments({
    $or: [
      { storeLogo: { $regex: 'cloudinary\\.com' } },
      { storeLogoPath: { $regex: 'cloudinary\\.com' } },
      { profileImagePath: { $regex: 'cloudinary\\.com' } },
    ]
  });
  const remainingProducts = await db.collection('products').countDocuments({
    $or: [
      { brandLogo: { $regex: 'cloudinary\\.com' } },
      { images: { $elemMatch: { $regex: 'cloudinary' } } },
    ]
  });
  console.log('\nRemaining cloudinary refs - users:', remainingUsers, ', products:', remainingProducts);

  await mongoose.disconnect();
})();
