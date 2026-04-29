require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Clear images for rejected product with dead cloudinary URL
  await db.collection('products').updateOne(
    { _id: new mongoose.Types.ObjectId('690b1a016a5aa640ef8a0694') },
    { $set: { images: [] } }
  );
  console.log('Done - cleared images for rejected product "უსახელი"');

  // Final count
  const users = await db.collection('users').countDocuments({
    $or: [
      { storeLogo: { $regex: 'cloudinary\\.com' } },
      { storeLogoPath: { $regex: 'cloudinary\\.com' } },
      { profileImagePath: { $regex: 'cloudinary\\.com' } },
    ]
  });
  const products = await db.collection('products').countDocuments({
    $or: [
      { brandLogo: { $regex: 'cloudinary\\.com' } },
      { images: { $elemMatch: { $regex: 'cloudinary' } } },
    ]
  });
  console.log(`\n🏁 Final cloudinary refs — users: ${users}, products: ${products}`);

  await mongoose.disconnect();
})();
