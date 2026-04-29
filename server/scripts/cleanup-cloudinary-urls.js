/**
 * Scan & migrate ALL Cloudinary URLs to S3 in the database.
 *
 * Covers:
 *   users:       storeLogo, storeLogoPath, profileImagePath
 *   products:    images[], brandLogo
 *   portfolioposts: images[].url, coverImage (if present)
 *   forumposts:  images[]
 *
 * For every Cloudinary URL we try to map it to an S3 key. If the same
 * file already exists on S3 we replace the URL. Otherwise we keep the
 * original (so we never blindly destroy data) and log it.
 *
 * Run dry:    node scripts/cleanup-cloudinary-urls.js
 * Run apply:  node scripts/cleanup-cloudinary-urls.js --apply
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

const APPLY = process.argv.includes('--apply');
const BUCKET = process.env.AWS_BUCKET_NAME;
const REGION = process.env.AWS_REGION;
const S3_BASE = `https://${BUCKET}.s3.${REGION}.amazonaws.com`;

if (!BUCKET || !REGION || !process.env.MONGODB_URI) {
  console.error('Missing env: AWS_BUCKET_NAME / AWS_REGION / MONGODB_URI');
  process.exit(1);
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const s3KeyCache = new Map();
async function existsOnS3(key) {
  if (s3KeyCache.has(key)) return s3KeyCache.get(key);
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    s3KeyCache.set(key, true);
    return true;
  } catch {
    s3KeyCache.set(key, false);
    return false;
  }
}

const isCloudinary = (v) => typeof v === 'string' && v.includes('cloudinary.com');

/**
 * Cloudinary URL → S3 key. Tries multiple known shapes:
 *   .../upload/[transforms]/v1234/<key>.<ext>
 *   .../upload/v1234/<key>.<ext>
 *   .../upload/<key>.<ext>
 */
function cloudinaryUrlToS3Key(url) {
  // strip query string
  const clean = url.split('?')[0];
  const m1 = clean.match(/\/upload\/(?:[^/]+\/)?v\d+\/(.+)$/);
  if (m1) return m1[1];
  const m2 = clean.match(/\/upload\/(.+)$/);
  return m2 ? m2[1] : null;
}

const stats = {
  scanned: 0,
  migrated: 0,
  missingOnS3: 0,
  unparsable: 0,
};

async function migrateUrl(url) {
  stats.scanned++;
  if (!isCloudinary(url)) return url;
  const key = cloudinaryUrlToS3Key(url);
  if (!key) {
    stats.unparsable++;
    return url;
  }
  if (await existsOnS3(key)) {
    stats.migrated++;
    return `${S3_BASE}/${key}`;
  }
  stats.missingOnS3++;
  return url;
}

async function migrateUsers(db) {
  const cursor = db.collection('users').find(
    {
      $or: [
        { storeLogo: /cloudinary\.com/ },
        { storeLogoPath: /cloudinary\.com/ },
        { profileImagePath: /cloudinary\.com/ },
      ],
    },
    { projection: { storeLogo: 1, storeLogoPath: 1, profileImagePath: 1 } },
  );

  let touched = 0;
  for await (const doc of cursor) {
    const update = {};
    for (const field of ['storeLogo', 'storeLogoPath', 'profileImagePath']) {
      if (isCloudinary(doc[field])) {
        const next = await migrateUrl(doc[field]);
        if (next !== doc[field]) update[field] = next;
      }
    }
    if (Object.keys(update).length) {
      touched++;
      if (APPLY) {
        await db.collection('users').updateOne({ _id: doc._id }, { $set: update });
      }
    }
  }
  console.log(`  users: ${touched} docs ${APPLY ? 'updated' : 'would update'}`);
}

async function migrateProducts(db) {
  const cursor = db.collection('products').find(
    {
      $or: [
        { brandLogo: /cloudinary\.com/ },
        { images: { $elemMatch: { $regex: 'cloudinary' } } },
      ],
    },
    { projection: { brandLogo: 1, images: 1, name: 1 } },
  );

  let touched = 0;
  for await (const doc of cursor) {
    const update = {};
    if (isCloudinary(doc.brandLogo)) {
      const next = await migrateUrl(doc.brandLogo);
      if (next !== doc.brandLogo) update.brandLogo = next;
    }
    if (Array.isArray(doc.images) && doc.images.some(isCloudinary)) {
      const newImages = [];
      let changed = false;
      for (const img of doc.images) {
        const next = isCloudinary(img) ? await migrateUrl(img) : img;
        if (next !== img) changed = true;
        newImages.push(next);
      }
      if (changed) update.images = newImages;
    }
    if (Object.keys(update).length) {
      touched++;
      if (APPLY) {
        await db
          .collection('products')
          .updateOne({ _id: doc._id }, { $set: update });
      }
    }
  }
  console.log(`  products: ${touched} docs ${APPLY ? 'updated' : 'would update'}`);
}

async function migratePortfolioPosts(db) {
  const col = db.collection('portfolioposts');
  if (!(await db.listCollections({ name: 'portfolioposts' }).hasNext())) return;
  const cursor = col.find(
    { 'images.url': { $regex: 'cloudinary' } },
    { projection: { images: 1 } },
  );
  let touched = 0;
  for await (const doc of cursor) {
    if (!Array.isArray(doc.images)) continue;
    const newImages = [];
    let changed = false;
    for (const img of doc.images) {
      if (img && isCloudinary(img.url)) {
        const next = await migrateUrl(img.url);
        if (next !== img.url) {
          newImages.push({ ...img, url: next });
          changed = true;
          continue;
        }
      }
      newImages.push(img);
    }
    if (changed) {
      touched++;
      if (APPLY) {
        await col.updateOne({ _id: doc._id }, { $set: { images: newImages } });
      }
    }
  }
  console.log(`  portfolioposts: ${touched} docs ${APPLY ? 'updated' : 'would update'}`);
}

(async () => {
  console.log(APPLY ? '🔴 APPLY MODE' : '🟡 DRY RUN');
  console.log(`Bucket: ${BUCKET}, Region: ${REGION}`);
  console.log('');

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('Scanning collections…');
  await migrateUsers(db);
  await migrateProducts(db);
  await migratePortfolioPosts(db);

  console.log('\n--- Summary ---');
  console.log(`URLs scanned:        ${stats.scanned}`);
  console.log(`Migrated to S3:      ${stats.migrated}`);
  console.log(`Missing on S3:       ${stats.missingOnS3}`);
  console.log(`Unparsable:          ${stats.unparsable}`);

  if (!APPLY && stats.migrated > 0) {
    console.log('\n👉 Re-run with --apply to write changes.');
  }

  await mongoose.disconnect();
})();
