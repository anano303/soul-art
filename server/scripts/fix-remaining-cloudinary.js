require('dotenv').config();
const mongoose = require('mongoose');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

const BUCKET = process.env.AWS_BUCKET_NAME;
const REGION = process.env.AWS_REGION;
const S3_BASE = `https://${BUCKET}.s3.${REGION}.amazonaws.com`;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function existsOnS3(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // --- 1. Fix Tamar Basilia: use first product image as storeLogo ---
  const tamarLogo = 'https://soulart-s3.s3.eu-north-1.amazonaws.com/ecommerce/l7z514dmo0zslpe7cpys.jpg';
  await db.collection('users').updateOne(
    { email: 'tamarbasilia789@gmail.com' },
    { $set: { storeLogoPath: tamarLogo, storeLogo: tamarLogo } }
  );
  // Update all her products brandLogo
  const tamar = await db.collection('users').findOne({ email: 'tamarbasilia789@gmail.com' });
  await db.collection('products').updateMany(
    { user: tamar._id, brandLogo: null },
    { $set: { brandLogo: tamarLogo } }
  );
  console.log('✅ Tamar Basilia: storeLogo set, products brandLogo updated');

  // --- 2. Fix Eka: check if her logo key exists on S3, otherwise use her product image ---
  // Key: artists/logos/y3kc8lqixjkivqlheakl.jpg
  const ekaKey = 'artists/logos/y3kc8lqixjkivqlheakl.jpg';
  const ekaOnS3 = await existsOnS3(ekaKey);
  let ekaLogo;
  if (ekaOnS3) {
    ekaLogo = `${S3_BASE}/${ekaKey}`;
    console.log('✅ Eka logo found on S3:', ekaLogo);
  } else {
    // Use her product image as fallback
    const ekaProduct = await db.collection('products').findOne(
      { user: new mongoose.Types.ObjectId('690d080c8418eecc1a70a84c') },
      { projection: { images: { $slice: 1 } } }
    );
    ekaLogo = ekaProduct?.images?.[0] || null;
    console.log('⚠️ Eka logo NOT on S3, using product image:', ekaLogo);
  }
  if (ekaLogo) {
    await db.collection('users').updateOne(
      { _id: new mongoose.Types.ObjectId('690d080c8418eecc1a70a84c') },
      { $set: { storeLogoPath: ekaLogo, storeLogo: ekaLogo } }
    );
    // Fix her product brandLogo too
    await db.collection('products').updateMany(
      { user: new mongoose.Types.ObjectId('690d080c8418eecc1a70a84c'), brandLogo: { $regex: 'cloudinary' } },
      { $set: { brandLogo: ekaLogo } }
    );
    console.log('✅ Eka: storeLogo & brandLogo updated');
  }

  // --- 3. Fix product "უსახელი" (id: 690b1a016a5aa640ef8a0694) - images[] has cloudinary URL ---
  // Key: ecommerce/x7ehcavo9vcdo7k8eoe8.jpg
  const usaxeliKey = 'ecommerce/x7ehcavo9vcdo7k8eoe8.jpg';
  const usaxeliOnS3 = await existsOnS3(usaxeliKey);
  if (usaxeliOnS3) {
    const s3Url = `${S3_BASE}/${usaxeliKey}`;
    await db.collection('products').updateOne(
      { _id: new mongoose.Types.ObjectId('690b1a016a5aa640ef8a0694') },
      { $set: { images: [s3Url] } }
    );
    console.log('✅ Product "უსახელი": image migrated to S3:', s3Url);
  } else {
    console.log('❌ Product "უსახელი" image not on S3 - leaving as is');
  }

  // --- Final check ---
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
  console.log(`\n🏁 Remaining cloudinary refs — users: ${remainingUsers}, products: ${remainingProducts}`);

  await mongoose.disconnect();
})();
