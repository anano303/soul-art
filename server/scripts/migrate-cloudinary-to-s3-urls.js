/**
 * Migrate Cloudinary URLs to S3 URLs in product images
 * 
 * Cloudinary URL: https://res.cloudinary.com/dsufx8uzd/image/upload/q_auto,f_auto,w_1024/v1758980152/ecommerce/filename.jpg
 * S3 URL: https://soulart-s3.s3.eu-north-1.amazonaws.com/ecommerce/filename.jpg
 * 
 * Usage:
 *   node scripts/migrate-cloudinary-to-s3-urls.js          # dry run
 *   node scripts/migrate-cloudinary-to-s3-urls.js --apply   # actually update DB
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

const APPLY = process.argv.includes('--apply');
const S3_BASE = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`;

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function existsOnS3(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

function cloudinaryUrlToS3Key(url) {
  // Extract path after version: /v1234567/ecommerce/filename.jpg => ecommerce/filename.jpg
  const match = url.match(/\/v\d+\/(.+?)$/);
  return match ? match[1] : null;
}

(async () => {
  console.log(APPLY ? '🔴 APPLY MODE - will update DB' : '🟡 DRY RUN - no changes');
  console.log('');

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const products = await db.collection('products').find({
    'images': { $elemMatch: { $regex: 'cloudinary' } }
  }).project({ _id: 1, name: 1, images: 1 }).toArray();

  console.log(`Found ${products.length} products with Cloudinary URLs\n`);

  let updated = 0, skipped = 0, missing = 0;

  for (const product of products) {
    const newImages = [];
    let hasChanges = false;

    for (const imgUrl of product.images) {
      if (!imgUrl.includes('cloudinary')) {
        newImages.push(imgUrl);
        continue;
      }

      const s3Key = cloudinaryUrlToS3Key(imgUrl);
      if (!s3Key) {
        console.log(`  ⚠️ Cannot parse: ${imgUrl}`);
        newImages.push(imgUrl);
        skipped++;
        continue;
      }

      const exists = await existsOnS3(s3Key);
      if (exists) {
        const s3Url = `${S3_BASE}/${s3Key}`;
        newImages.push(s3Url);
        hasChanges = true;
      } else {
        console.log(`  ❌ NOT on S3: ${s3Key} (${product.name})`);
        newImages.push(imgUrl); // keep old URL
        missing++;
      }
    }

    if (hasChanges) {
      if (APPLY) {
        await db.collection('products').updateOne(
          { _id: product._id },
          { $set: { images: newImages } }
        );
      }
      updated++;
      if (updated <= 5) {
        console.log(`  ✅ ${product.name}: ${product.images[0].substring(0, 60)}... => ${newImages[0].substring(0, 60)}...`);
      }
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Updated: ${updated}`);
  console.log(`Missing from S3: ${missing}`);
  console.log(`Skipped (parse error): ${skipped}`);

  if (!APPLY && updated > 0) {
    console.log(`\n👉 Run with --apply to update DB`);
  }

  await mongoose.disconnect();
})();
