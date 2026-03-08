/**
 * Cloudinary → AWS S3 მიგრაციის სკრიპტი
 *
 * ეს სკრიპტი:
 * 1. კითხულობს ყველა Cloudinary URL-ს მონგოდან (products, users, banners, forums, blogs, portfolios, categories)
 * 2. ჩამოტვირთავს სურათებს Cloudinary-დან
 * 3. ატვირთავს S3-ზე იგივე folder სტრუქტურით
 * 4. ააპდეითებს მონგოს ჩანაწერებს ახალი S3 URL-ებით
 * 5. Cloudinary-დან არაფერს წაშლის!
 *
 * გაშვება:
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-cloudinary-to-s3.ts
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-cloudinary-to-s3.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-cloudinary-to-s3.ts --collection=products
 */

import { MongoClient, ObjectId } from 'mongodb';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || '';
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'soulart-s3';
const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || '';
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';

// All Cloudinary cloud names (old + current)
const ALL_CLOUD_NAMES = [
  'dsufx8uzd',
  'dwfqjtdu2',
  'dmvh7vwpu',
  'dbz1wfzzj',
  'dbzlwfzzj',
];

// Old/retired cloud names (ბაზაში ძველი URL-ებია მაგრამ სურათები ახალ cloud-ზეა გადატანილი)
const OLD_CLOUD_NAMES = ['dsufx8uzd', 'dwfqjtdu2', 'dmvh7vwpu'];

// Active cloud name (სადაც რეალურად არის ყველა სურათი)
const ACTIVE_CLOUD_NAME = 'dbzlwfzzj';

// CLI arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const COLLECTION_FILTER =
  args.find((a) => a.startsWith('--collection='))?.split('=')[1] || null;
const SKIP_EXISTING = !args.includes('--force');
const BATCH_SIZE = 5; // Concurrent uploads

// Progress file
const PROGRESS_FILE = path.join(__dirname, '../../.s3-migration-progress.json');

// S3 Client
const s3 = new S3Client({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
  region: AWS_REGION,
});

interface MigrationProgress {
  migrated: Record<string, string>; // oldUrl -> s3Url
  failed: Array<{ url: string; error: string }>;
  lastUpdated: string;
}

interface MigrationStats {
  totalUrls: number;
  migrated: number;
  skipped: number;
  failed: number;
  normalizedUrls: number; // URLs where old cloud name was replaced
  errors: Array<{ url: string; error: string }>;
}

// ===== Helpers =====

function isCloudinaryUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return (
    ALL_CLOUD_NAMES.some((name) => url.includes(name)) ||
    url.includes('res.cloudinary.com')
  );
}

/**
 * ძველი cloud name-ის URL-ს გადააქცევს ახალ, ხელმისაწვდომ URL-ად.
 * ბაზაში ძველი URL-ებია (dsufx8uzd, dwfqjtdu2, dmvh7vwpu) მაგრამ
 * სურათები რეალურად გადატანილია ახალ cloud-ზე (dbzlwfzzj).
 * Interceptor ამას აკეთებს API response-ებში, ჩვენ იგივეს ვაკეთებთ აქ.
 */
function normalizeCloudinaryUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  let normalized = url;
  for (const oldName of OLD_CLOUD_NAMES) {
    normalized = normalized.replace(
      new RegExp(oldName, 'g'),
      ACTIVE_CLOUD_NAME,
    );
  }
  return normalized;
}

function hasOldCloudName(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return OLD_CLOUD_NAMES.some((name) => url.includes(name));
}

function extractCloudinaryPath(url: string): {
  folder: string;
  filename: string;
  extension: string;
  resourceType: string;
} {
  try {
    const urlObj = new URL(url);
    const segments = urlObj.pathname.split('/').filter(Boolean);

    // Find resource type (image/video/raw)
    const resourceTypeIndex = segments.findIndex((s) =>
      ['image', 'video', 'raw'].includes(s),
    );
    const resourceType =
      resourceTypeIndex >= 0 ? segments[resourceTypeIndex] : 'image';

    // Get path after 'upload' and optional version
    const uploadIndex = segments.indexOf('upload');
    let pathSegments =
      uploadIndex >= 0 ? segments.slice(uploadIndex + 1) : segments;

    // Remove version segment (e.g., v1234567890)
    pathSegments = pathSegments.filter((s) => !/^v\d+$/.test(s));

    // Remove transformation segments (e.g., q_auto,f_auto,w_1024)
    // Transformations contain commas OR match patterns like w_1024, q_auto, f_auto, c_fill, etc.
    pathSegments = pathSegments.filter((s) => {
      if (s.includes(',')) return false; // e.g., q_auto,f_auto,w_1024
      if (/^[a-z]{1,2}_[a-z0-9]+$/.test(s)) return false; // e.g., w_1024, q_auto, f_auto
      return true;
    });

    // If only transformations were removed and we have no path, fall back
    if (pathSegments.length === 0) {
      // Try getting everything after version
      const versionIndex = segments.findIndex((s) => /^v\d+$/.test(s));
      if (versionIndex >= 0) {
        pathSegments = segments.slice(versionIndex + 1);
      }
    }

    if (pathSegments.length === 0) {
      // Last resort: use hash of URL
      const hash = crypto.createHash('md5').update(url).digest('hex');
      return {
        folder: 'migrated',
        filename: hash,
        extension: '.jpg',
        resourceType,
      };
    }

    const lastSegment = pathSegments[pathSegments.length - 1];
    const extMatch = lastSegment.match(/\.([^.]+)$/);
    const extension = extMatch ? `.${extMatch[1].toLowerCase()}` : '.jpg';
    const filenameWithoutExt = extMatch
      ? lastSegment.slice(0, -(extMatch[1].length + 1))
      : lastSegment;
    const folder = pathSegments.slice(0, -1).join('/');

    return {
      folder: folder || 'migrated',
      filename: filenameWithoutExt,
      extension,
      resourceType,
    };
  } catch {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    return {
      folder: 'migrated',
      filename: hash,
      extension: '.jpg',
      resourceType: 'image',
    };
  }
}

function getS3Key(url: string): string {
  const { folder, filename, extension } = extractCloudinaryPath(url);
  return folder
    ? `${folder}/${filename}${extension}`
    : `${filename}${extension}`;
}

function getS3PublicUrl(key: string): string {
  return `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

async function downloadImage(
  url: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const options = { timeout: 30000 };

    protocol
      .get(url, options, (response) => {
        const statusCode = response.statusCode ?? 0;

        if ([301, 302, 307, 308].includes(statusCode)) {
          const nextLocation = response.headers.location;
          if (!nextLocation) {
            reject(new Error('Redirect without location'));
            return;
          }
          downloadImage(nextLocation).then(resolve).catch(reject);
          return;
        }

        if (statusCode !== 200) {
          reject(new Error(`HTTP ${statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('error', reject);
        response.on('end', () => {
          const ct =
            (Array.isArray(response.headers['content-type'])
              ? response.headers['content-type'][0]
              : response.headers['content-type']) || 'application/octet-stream';
          resolve({ buffer: Buffer.concat(chunks), contentType: ct });
        });
      })
      .on('error', reject);
  });
}

async function s3KeyExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: AWS_BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadToS3(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

// Progress management
function loadProgress(): MigrationProgress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch {}
  return { migrated: {}, failed: [], lastUpdated: new Date().toISOString() };
}

function saveProgress(progress: MigrationProgress): void {
  progress.lastUpdated = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ===== URL Collection =====

async function getAllCloudinaryUrls(
  db: any,
): Promise<
  Map<
    string,
    Array<{
      collection: string;
      docId: string;
      field: string;
      arrayIndex?: number;
    }>
  >
> {
  const urlMap = new Map<
    string,
    Array<{
      collection: string;
      docId: string;
      field: string;
      arrayIndex?: number;
    }>
  >();

  const addUrl = (
    url: string,
    collection: string,
    docId: string,
    field: string,
    arrayIndex?: number,
  ) => {
    if (!isCloudinaryUrl(url)) return;
    if (!urlMap.has(url)) urlMap.set(url, []);
    urlMap.get(url)!.push({ collection, docId, field, arrayIndex });
  };

  // 1. Products - images[], brandLogo, thumbnail
  if (!COLLECTION_FILTER || COLLECTION_FILTER === 'products') {
    console.log('  📦 Scanning products...');
    const products = await db.collection('products').find({}).toArray();
    for (const p of products) {
      if (p.images && Array.isArray(p.images)) {
        p.images.forEach((img: string, i: number) =>
          addUrl(img, 'products', p._id.toString(), 'images', i),
        );
      }
      if (p.brandLogo)
        addUrl(p.brandLogo, 'products', p._id.toString(), 'brandLogo');
      if (p.thumbnail)
        addUrl(p.thumbnail, 'products', p._id.toString(), 'thumbnail');
    }
  }

  // 2. Users - profileImagePath, storeLogoPath, storeLogo, artistCoverImage, artistGallery[]
  if (!COLLECTION_FILTER || COLLECTION_FILTER === 'users') {
    console.log('  👤 Scanning users...');
    const users = await db.collection('users').find({}).toArray();
    for (const u of users) {
      if (u.profileImagePath)
        addUrl(
          u.profileImagePath,
          'users',
          u._id.toString(),
          'profileImagePath',
        );
      if (u.storeLogoPath)
        addUrl(u.storeLogoPath, 'users', u._id.toString(), 'storeLogoPath');
      if (u.storeLogo)
        addUrl(u.storeLogo, 'users', u._id.toString(), 'storeLogo');
      if (u.artistCoverImage)
        addUrl(
          u.artistCoverImage,
          'users',
          u._id.toString(),
          'artistCoverImage',
        );
      if (u.artistGallery && Array.isArray(u.artistGallery)) {
        u.artistGallery.forEach((img: string, i: number) =>
          addUrl(img, 'users', u._id.toString(), 'artistGallery', i),
        );
      }
    }
  }

  // 3. Banners - imageUrl
  if (!COLLECTION_FILTER || COLLECTION_FILTER === 'banners') {
    console.log('  🖼️  Scanning banners...');
    const banners = await db.collection('banners').find({}).toArray();
    for (const b of banners) {
      if (b.imageUrl)
        addUrl(b.imageUrl, 'banners', b._id.toString(), 'imageUrl');
    }
  }

  // 4. Forums - imagePath
  if (!COLLECTION_FILTER || COLLECTION_FILTER === 'forums') {
    console.log('  💬 Scanning forums...');
    const forums = await db.collection('forums').find({}).toArray();
    for (const f of forums) {
      if (f.imagePath)
        addUrl(f.imagePath, 'forums', f._id.toString(), 'imagePath');
    }
  }

  // 5. Blog posts - coverImage, images[]
  if (!COLLECTION_FILTER || COLLECTION_FILTER === 'blogposts') {
    console.log('  📝 Scanning blog posts...');
    const blogs = await db.collection('blogposts').find({}).toArray();
    for (const b of blogs) {
      if (b.coverImage)
        addUrl(b.coverImage, 'blogposts', b._id.toString(), 'coverImage');
      if (b.images && Array.isArray(b.images)) {
        b.images.forEach((img: string, i: number) =>
          addUrl(img, 'blogposts', b._id.toString(), 'images', i),
        );
      }
    }
  }

  // 6. Portfolio posts - images[].url
  if (!COLLECTION_FILTER || COLLECTION_FILTER === 'portfolioposts') {
    console.log('  🎨 Scanning portfolio posts...');
    const portfolios = await db.collection('portfolioposts').find({}).toArray();
    for (const p of portfolios) {
      if (p.images && Array.isArray(p.images)) {
        p.images.forEach((img: any, i: number) => {
          if (img && img.url)
            addUrl(img.url, 'portfolioposts', p._id.toString(), 'images', i);
        });
      }
    }
  }

  // 7. Categories - image
  if (!COLLECTION_FILTER || COLLECTION_FILTER === 'categories') {
    console.log('  📂 Scanning categories...');
    const categories = await db.collection('categories').find({}).toArray();
    for (const c of categories) {
      if (c.image) addUrl(c.image, 'categories', c._id.toString(), 'image');
    }
  }

  return urlMap;
}

// ===== DB Update =====

async function updateDbUrls(
  db: any,
  urlMap: Map<
    string,
    Array<{
      collection: string;
      docId: string;
      field: string;
      arrayIndex?: number;
    }>
  >,
  oldUrl: string,
  newUrl: string,
): Promise<number> {
  const refs = urlMap.get(oldUrl) || [];
  let updated = 0;

  for (const ref of refs) {
    try {
      if (ref.arrayIndex !== undefined) {
        // Array field - need special handling
        if (ref.field === 'images' && ref.collection === 'portfolioposts') {
          // Portfolio posts have images[].url structure
          await db
            .collection(ref.collection)
            .updateOne(
              { _id: new ObjectId(ref.docId) },
              { $set: { [`images.${ref.arrayIndex}.url`]: newUrl } },
            );
        } else {
          // Regular string array (products.images, users.artistGallery, etc.)
          await db
            .collection(ref.collection)
            .updateOne(
              { _id: new ObjectId(ref.docId) },
              { $set: { [`${ref.field}.${ref.arrayIndex}`]: newUrl } },
            );
        }
      } else {
        // Simple field
        await db
          .collection(ref.collection)
          .updateOne(
            { _id: new ObjectId(ref.docId) },
            { $set: { [ref.field]: newUrl } },
          );
      }
      updated++;
    } catch (error: any) {
      console.error(
        `  ❌ Failed to update ${ref.collection}.${ref.docId}.${ref.field}: ${error.message}`,
      );
    }
  }

  return updated;
}

// ===== Batch Processing =====

async function processBatch(
  urls: string[],
  progress: MigrationProgress,
  stats: MigrationStats,
  db: any,
  urlMap: Map<
    string,
    Array<{
      collection: string;
      docId: string;
      field: string;
      arrayIndex?: number;
    }>
  >,
): Promise<void> {
  await Promise.all(
    urls.map(async (url) => {
      // Already migrated?
      if (progress.migrated[url]) {
        stats.skipped++;
        return;
      }

      const s3Key = getS3Key(url);

      // Check if already in S3
      if (SKIP_EXISTING) {
        const exists = await s3KeyExists(s3Key);
        if (exists) {
          const s3Url = getS3PublicUrl(s3Key);
          progress.migrated[url] = s3Url;
          stats.skipped++;

          // Still update DB even if file exists in S3
          if (!DRY_RUN) {
            await updateDbUrls(db, urlMap, url, s3Url);
          }
          return;
        }
      }

      try {
        // Normalize URL: replace old cloud names with active one
        // ბაზაში ძველი URL-ებია მაგრამ სურათები ახალ cloud-ზეა
        const downloadUrl = normalizeCloudinaryUrl(url);
        if (downloadUrl !== url) {
          stats.normalizedUrls++;
        }

        // Download from Cloudinary (using normalized/accessible URL)
        const { buffer, contentType } = await downloadImage(downloadUrl);

        if (DRY_RUN) {
          const wasNormalized = downloadUrl !== url ? ' [normalized]' : '';
          console.log(
            `  [DRY-RUN] Would upload: ${s3Key} (${(buffer.length / 1024).toFixed(1)}KB)${wasNormalized}`,
          );
          stats.migrated++;
          return;
        }

        // Upload to S3
        await uploadToS3(s3Key, buffer, contentType);
        const s3Url = getS3PublicUrl(s3Key);

        // Update DB
        await updateDbUrls(db, urlMap, url, s3Url);

        // Track progress
        progress.migrated[url] = s3Url;
        stats.migrated++;
      } catch (error: any) {
        const errMsg = error.message || 'Unknown error';
        stats.failed++;
        stats.errors.push({ url, error: errMsg });
        progress.failed.push({ url, error: errMsg });
        console.error(`  ❌ Failed: ${url} → ${errMsg}`);
      }
    }),
  );
}

// ===== Main =====

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Cloudinary → AWS S3 Migration Script');
  console.log('═══════════════════════════════════════════════════');
  console.log(
    `  Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '🚀 LIVE MIGRATION'}`,
  );
  console.log(`  Bucket: ${AWS_BUCKET_NAME}`);
  console.log(`  Region: ${AWS_REGION}`);
  if (COLLECTION_FILTER)
    console.log(`  Collection filter: ${COLLECTION_FILTER}`);
  console.log(`  Skip existing: ${SKIP_EXISTING}`);
  console.log('═══════════════════════════════════════════════════\n');

  if (!MONGODB_URI) throw new Error('MONGODB_URI not set');
  if (!AWS_ACCESS_KEY) throw new Error('AWS_ACCESS_KEY not set');
  if (!AWS_SECRET_ACCESS_KEY) throw new Error('AWS_SECRET_ACCESS_KEY not set');

  // Connect to MongoDB
  console.log('🔌 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  console.log('✅ Connected to MongoDB\n');

  // Load previous progress
  const progress = loadProgress();
  const previouslyMigrated = Object.keys(progress.migrated).length;
  if (previouslyMigrated > 0) {
    console.log(
      `📋 Loaded previous progress: ${previouslyMigrated} URLs already migrated\n`,
    );
  }

  // Collect all Cloudinary URLs
  console.log('🔍 Scanning database for Cloudinary URLs...');
  const urlMap = await getAllCloudinaryUrls(db);
  const allUrls = Array.from(urlMap.keys());

  console.log(`\n📊 Found ${allUrls.length} unique Cloudinary URLs\n`);

  if (allUrls.length === 0) {
    console.log('✅ No Cloudinary URLs found. Nothing to migrate!');
    await client.close();
    return;
  }

  // Count URLs with old cloud names (will be normalized before download)
  const oldCloudNameUrls = allUrls.filter((url) => hasOldCloudName(url));

  // Show breakdown by collection
  const collectionCounts: Record<string, number> = {};
  for (const [, refs] of urlMap) {
    for (const ref of refs) {
      collectionCounts[ref.collection] =
        (collectionCounts[ref.collection] || 0) + 1;
    }
  }
  console.log('📋 URL-ები კოლექციების მიხედვით:');
  for (const [col, count] of Object.entries(collectionCounts).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`   ${col}: ${count}`);
  }

  if (oldCloudNameUrls.length > 0) {
    console.log(
      `\n🔄 ${oldCloudNameUrls.length} URL-ს ძველი cloud name აქვს (ავტომატურად შეიცვლება ${ACTIVE_CLOUD_NAME}-ით ჩამოტვირთვისას)`,
    );
    for (const cn of OLD_CLOUD_NAMES) {
      const count = oldCloudNameUrls.filter((u) => u.includes(cn)).length;
      if (count > 0)
        console.log(`   ${cn} → ${ACTIVE_CLOUD_NAME}: ${count} URLs`);
    }
  }

  console.log('');

  // Migration stats
  const stats: MigrationStats = {
    totalUrls: allUrls.length,
    migrated: 0,
    skipped: 0,
    failed: 0,
    normalizedUrls: 0,
    errors: [],
  };

  // Process ALL URLs in batches (old cloud names will be normalized before download)
  console.log(
    `⏳ Processing ${allUrls.length} URLs in batches of ${BATCH_SIZE}...\n`,
  );
  const startTime = Date.now();

  for (let i = 0; i < allUrls.length; i += BATCH_SIZE) {
    const batch = allUrls.slice(i, i + BATCH_SIZE);
    await processBatch(batch, progress, stats, db, urlMap);

    // Save progress every 10 batches
    if ((i / BATCH_SIZE) % 10 === 0 && !DRY_RUN) {
      saveProgress(progress);
    }

    // Log progress
    const processed = Math.min(i + BATCH_SIZE, allUrls.length);
    const pct = Math.round((processed / allUrls.length) * 100);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(
      `\r  📈 Progress: ${processed}/${allUrls.length} (${pct}%) | ✅ ${stats.migrated} | ⏭️ ${stats.skipped} | ❌ ${stats.failed} | 🔄 ${stats.normalizedUrls} | ⏱️ ${elapsed}s`,
    );
  }

  // Final save
  if (!DRY_RUN) {
    saveProgress(progress);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('  Migration Complete!');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Total URLs:    ${stats.totalUrls}`);
  console.log(`  ✅ Migrated:    ${stats.migrated}`);
  console.log(`  ⏭️  Skipped:     ${stats.skipped}`);
  console.log(
    `  🔄 Normalized:  ${stats.normalizedUrls} (ძველი cloud name → ${ACTIVE_CLOUD_NAME})`,
  );
  console.log(`  ❌ Failed:      ${stats.failed}`);
  console.log(`  ⏱️  Total time:  ${totalTime}s`);
  console.log('═══════════════════════════════════════════════════');

  if (stats.errors.length > 0) {
    console.log('\n⚠️  Failed URLs:');
    stats.errors.slice(0, 20).forEach((e) => {
      console.log(`   ${e.url}`);
      console.log(`     Error: ${e.error}`);
    });
    if (stats.errors.length > 20) {
      console.log(`   ... and ${stats.errors.length - 20} more`);
    }
  }

  if (DRY_RUN) {
    console.log('\n💡 This was a DRY RUN. No changes were made.');
    console.log('   Run without --dry-run to actually migrate.');
  } else {
    console.log('\n💡 Cloudinary-ზე არაფერი წაშლილა!');
    console.log('   S3-ზე მიგრაცია დასრულდა. ახლა შეგიძლია:');
    console.log('   1. ლოკალურად ჩართო AWS_ENABLED=true და შეამოწმო');
    console.log('   2. თუ ყველაფერი კარგადაა, პროდაქშენზეც ჩართო');
    console.log('   3. Cloudinary-ს წაშლა მოგვიანებით, როცა დარწმუნდები');
  }

  await client.close();
}

main().catch((error) => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
