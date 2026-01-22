import { v2 as cloudinary, UploadApiOptions } from 'cloudinary';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });


// All old cloud names, oldest first, latest old last
const CLOUD_NAMES = ['dsufx8uzd', 'dwfqjtdu2', 'dmvh7vwpu'];
const NEW_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dbzlwfzzj';

// Progress tracking file
const PROGRESS_FILE = path.join(__dirname, '../../.cloudinary-migration-progress.json');

// Regex to match any old cloud name
const OLD_CLOUD_REGEX = new RegExp(`(${CLOUD_NAMES.map(n => n.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`, 'g');

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  heic: 'image/heic',
  heif: 'image/heif',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mpeg: 'video/mpeg',
  webm: 'video/webm',
  pdf: 'application/pdf',
  zip: 'application/zip',
};

// Configure new Cloudinary account
cloudinary.config({
  cloud_name: NEW_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface MigrationStats {
  totalUrls: number;
  successfulUploads: number;
  failedUploads: number;
  skippedUrls: number;
  errors: Array<{ url: string; error: string }>;
}

// Cache of existing resources in new account (fetched once at startup)
let existingResourcesCache: Set<string> = new Set();
let useProgressFile = false; // Track if we have a progress file

// Progress tracking
interface MigrationProgress {
  destinationCloud: string; // The cloud name assets were copied TO
  completed: string[]; // Public IDs that have been successfully uploaded
  lastUpdated: string;
}

function loadProgress(): Set<string> | null {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')) as MigrationProgress;
      
      // Check if progress is for the current destination cloud
      if (data.destinationCloud && data.destinationCloud !== NEW_CLOUD_NAME) {
        console.log(`⚠️  Progress file is for different cloud (${data.destinationCloud}), ignoring...`);
        console.log(`   Current destination: ${NEW_CLOUD_NAME}`);
        return null;
      }
      
      console.log(`📋 Loaded progress file: ${data.completed.length} already uploaded to ${data.destinationCloud || 'unknown'} (last updated: ${data.lastUpdated})`);
      return new Set(data.completed);
    }
  } catch (error) {
    console.warn('⚠️  Could not load progress file');
  }
  return null;
}

function saveProgress(completed: Set<string>): void {
  const progress: MigrationProgress = {
    destinationCloud: NEW_CLOUD_NAME,
    completed: Array.from(completed),
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

/**
 * Initialize the resources cache
 * If progress file exists → use it (fast)
 * If not → we'll check each resource individually via API
 */
function initializeCache(): void {
  const progress = loadProgress();
  
  if (progress) {
    existingResourcesCache = progress;
    useProgressFile = true;
    console.log(`✅ Using progress file for skip checks (${progress.size} resources)\n`);
  } else {
    existingResourcesCache = new Set();
    useProgressFile = false;
    console.log(`ℹ️  No progress file found - will check each resource via API before uploading\n`);
  }
}

/**
 * Check if resource exists in new Cloudinary account via API
 */
async function checkResourceExists(publicId: string, resourceType: string): Promise<boolean> {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType as any,
      type: 'upload',
    });
    return !!(result && result.public_id);
  } catch (error: any) {
    const httpCode = error?.http_code || error?.error?.http_code;
    // 404 means not found, which is expected
    if (httpCode === 404) {
      return false;
    }
    // Rate limit - show specific message
    if (httpCode === 420) {
      console.warn(`   ⚠️  Rate limited, will try upload`);
      return false;
    }
    // Other error - log and assume not exists
    console.warn(`   ⚠️  API check failed (${httpCode || 'network error'}), will try upload`);
    return false;
  }
}

interface ExtractedCloudinaryPath {
  publicId: string;
  folder?: string;
  resourceType: string;
  version?: string;
  format?: string;
  filename: string;
  filenameWithoutExtension: string;
}

/**
 * Download image from URL
 */
async function downloadImage(
  url: string,
  fallbackFormat?: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol
      .get(url, (response) => {
        const statusCode = response.statusCode ?? 0;

        if ([301, 302, 307, 308].includes(statusCode)) {
          const nextLocation = response.headers.location;
          if (!nextLocation) {
            reject(new Error('Redirect encountered without location header'));
            return;
          }
          downloadImage(nextLocation, fallbackFormat)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (statusCode !== 200) {
          reject(new Error(`Failed to download: ${statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('error', reject);
        response.on('end', () => {
          const headerContentType = Array.isArray(
            response.headers['content-type'],
          )
            ? response.headers['content-type'][0]
            : response.headers['content-type'];
          const normalizedFormat = fallbackFormat
            ? fallbackFormat.toLowerCase()
            : undefined;
          const contentType =
            headerContentType ||
            (normalizedFormat
              ? EXTENSION_TO_MIME[normalizedFormat]
              : undefined) ||
            'application/octet-stream';

          resolve({
            buffer: Buffer.concat(chunks),
            contentType,
          });
        });
      })
      .on('error', reject);
  });
}

/**
 * Extract Cloudinary public_id and folder from URL
 */
function extractCloudinaryPath(url: string): ExtractedCloudinaryPath {
  try {
    const urlObj = new URL(url);
    const segments = urlObj.pathname.split('/').filter(Boolean);

    const resourceTypeIndex = segments.findIndex((segment) =>
      ['image', 'video', 'raw'].includes(segment),
    );

    if (resourceTypeIndex === -1) {
      throw new Error('Invalid Cloudinary URL');
    }

    const resourceType = segments[resourceTypeIndex];
    const uploadSegments = segments.slice(resourceTypeIndex + 2);

    if (uploadSegments.length === 0) {
      throw new Error('Missing upload path segments');
    }

    const versionSegmentIndex = uploadSegments.findIndex((segment) =>
      /^v\d+$/.test(segment),
    );
    const version =
      versionSegmentIndex >= 0
        ? uploadSegments[versionSegmentIndex]
        : undefined;

    const pathSegments =
      versionSegmentIndex >= 0
        ? uploadSegments.slice(versionSegmentIndex + 1)
        : uploadSegments.filter(
            (segment, index) => index !== 0 || uploadSegments.length === 1,
          );

    if (pathSegments.length === 0) {
      throw new Error('Failed to determine public_id path');
    }

    const filename = pathSegments[pathSegments.length - 1];
    const formatMatch = filename.match(/\.([^.]+)$/);
    const format = formatMatch ? formatMatch[1].toLowerCase() : undefined;
    const filenameWithoutExtension = formatMatch
      ? filename.slice(0, -(formatMatch[1].length + 1))
      : filename;
    const folderSegments = pathSegments.slice(0, -1);
    const folder =
      folderSegments.length > 0 ? folderSegments.join('/') : undefined;
    const publicId = folder
      ? `${folder}/${filenameWithoutExtension}`
      : filenameWithoutExtension;

    return {
      publicId,
      folder,
      resourceType,
      version,
      format,
      filename,
      filenameWithoutExtension,
    };
  } catch (error) {
    console.error('Error parsing URL:', url, error);
    throw error;
  }
}

/**
 * Upload image to new Cloudinary with same public_id
 */
async function migrateImage(
  url: string,
  stats: MigrationStats,
): Promise<boolean> {
  try {
    const { publicId, folder, resourceType, format, filenameWithoutExtension } =
      extractCloudinaryPath(url);


    // Always replace any old cloud name with the latest old cloud name for sourceUrl
    const LATEST_OLD_CLOUD_NAME = CLOUD_NAMES[CLOUD_NAMES.length - 1];
    let sourceUrl = url;
    for (const oldName of CLOUD_NAMES) {
      if (sourceUrl.includes(oldName)) {
        sourceUrl = sourceUrl.replace(oldName, LATEST_OLD_CLOUD_NAME);
      }
    }
    // For logging, show if any replacement was made
    const replacedCloud = CLOUD_NAMES.find(n => url.includes(n) && n !== LATEST_OLD_CLOUD_NAME);

    console.log(`   📥 Original URL: ${url}`);
    if (replacedCloud) {
      console.log(`   🔄 Source URL (${replacedCloud}→${LATEST_OLD_CLOUD_NAME}): ${sourceUrl}`);
    }
    console.log(`      Public ID: ${publicId}`);
    console.log(`      Folder: ${folder || 'root'}`);

    // Check if asset already exists
    if (useProgressFile) {
      // Fast check using local progress file
      if (existingResourcesCache.has(publicId)) {
        console.log(`   ⏭️  Already in progress file, skipping`);
        stats.skippedUrls++;
        return true;
      }
    } else {
      // No progress file - check via API
      const exists = await checkResourceExists(publicId, resourceType);
      if (exists) {
        console.log(`   ⏭️  Already exists in new account, skipping`);
        existingResourcesCache.add(publicId); // Add to cache for progress file
        stats.skippedUrls++;
        return true;
      }
    }

    const { buffer, contentType } = await downloadImage(sourceUrl, format);
    const dataUri = `data:${contentType};base64,${buffer.toString('base64')}`;

    const uploadOptions: UploadApiOptions = {
      public_id: filenameWithoutExtension, // Just the filename without extension
      resource_type: resourceType as any,
      overwrite: false,
      invalidate: false,
      unique_filename: false,
      use_filename: false,
      type: 'upload',
    };

    // Set folder if exists - this creates folder structure in Cloudinary
    if (folder) {
      uploadOptions.folder = folder;
    }

    if (format) {
      uploadOptions.format = format;
    }

    console.log(`   📤 Uploading to new Cloudinary account...`);
    console.log(`      Folder: ${folder || '(root)'}, Filename: ${filenameWithoutExtension}.${format || 'jpg'}`);
    await cloudinary.uploader.upload(dataUri, uploadOptions);

    console.log(`   ✅ Uploaded successfully`);
    const newUrl = url.replace(OLD_CLOUD_REGEX, NEW_CLOUD_NAME);
    console.log(`      New URL: ${newUrl}`);
    stats.successfulUploads++;
    
    // Track progress locally
    existingResourcesCache.add(publicId);
    
    // Save progress every 10 uploads
    if (stats.successfulUploads % 10 === 0) {
      saveProgress(existingResourcesCache);
    }
    
    return true;
  } catch (error: any) {
    console.error(`   ❌ Failed: ${error.message}`);
    stats.failedUploads++;
    stats.errors.push({ url, error: error.message });
    return false;
  }
}

/**
 * Get all unique Cloudinary URLs from MongoDB
 */
async function getAllCloudinaryUrls(db: any): Promise<Set<string>> {
  const urls = new Set<string>();

  console.log('🔍 Collecting URLs from MongoDB...\n');


  // Helper to build $or regex for all old cloud names
  const cloudRegexOr = (field: string) => ({ $or: CLOUD_NAMES.map(name => ({ [field]: { $regex: name } })) });
  const hasOldCloud = (str: string) => str && CLOUD_NAMES.some(name => str.includes(name));

  // Products - images array
  console.log('📦 Checking Products...');
  const products = await db
    .collection('products')
    .find(cloudRegexOr('images'))
    .toArray();

  for (const product of products) {
    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        if (hasOldCloud(img)) {
          urls.add(img);
        }
      }
    }
    // Add brandLogo if exists
    if (hasOldCloud(product.brandLogo)) {
      urls.add(product.brandLogo);
    }
  }
  console.log(`   Found ${products.length} products with old URLs`);

  // Products - thumbnail
  const productsWithThumbnail = await db
    .collection('products')
    .find(cloudRegexOr('thumbnail'))
    .toArray();

  for (const product of productsWithThumbnail) {
    if (product.thumbnail) {
      urls.add(product.thumbnail);
    }
  }
  console.log(`   Found ${productsWithThumbnail.length} products with old thumbnails`);

  // Banners
  console.log('🎨 Checking Banners...');
  const banners = await db
    .collection('banners')
    .find(cloudRegexOr('imageUrl'))
    .toArray();

  for (const banner of banners) {
    if (banner.imageUrl) {
      urls.add(banner.imageUrl);
    }
  }
  console.log(`   Found ${banners.length} banners with old URLs`);

  // Users
  console.log('👤 Checking Users...');
  const users = await db
    .collection('users')
    .find({ $or: [
      ...CLOUD_NAMES.map(name => ({ profileImagePath: { $regex: name } })),
      ...CLOUD_NAMES.map(name => ({ storeLogo: { $regex: name } })),
      ...CLOUD_NAMES.map(name => ({ storeLogoPath: { $regex: name } })),
      ...CLOUD_NAMES.map(name => ({ artistCoverImage: { $regex: name } })),
      ...CLOUD_NAMES.map(name => ({ artistGallery: { $regex: name } })),
    ]})
    .toArray();

  for (const user of users) {
    if (hasOldCloud(user.profileImagePath)) {
      urls.add(user.profileImagePath);
    }
    if (hasOldCloud(user.storeLogo)) {
      urls.add(user.storeLogo);
    }
    if (hasOldCloud(user.storeLogoPath)) {
      urls.add(user.storeLogoPath);
    }
    if (hasOldCloud(user.artistCoverImage)) {
      urls.add(user.artistCoverImage);
    }
    // Artist Gallery - array of images
    if (user.artistGallery && Array.isArray(user.artistGallery)) {
      for (const img of user.artistGallery) {
        if (hasOldCloud(img)) {
          urls.add(img);
        }
      }
    }
  }
  console.log(`   Found ${users.length} users with old images`);

  // Blog posts
  console.log('📝 Checking Blog Posts...');
  const blogs = await db
    .collection('blogposts')
    .find({ $or: [
      ...CLOUD_NAMES.map(name => ({ coverImage: { $regex: name } })),
      ...CLOUD_NAMES.map(name => ({ images: { $regex: name } })),
    ]})
    .toArray();

  for (const blog of blogs) {
    if (hasOldCloud(blog.coverImage)) {
      urls.add(blog.coverImage);
    }
    if (blog.images && Array.isArray(blog.images)) {
      for (const img of blog.images) {
        if (hasOldCloud(img)) {
          urls.add(img);
        }
      }
    }
  }
  console.log(`   Found ${blogs.length} blog posts with old URLs`);

  // Portfolio Posts (most important - has 500+ URLs)
  console.log('🖼️  Checking Portfolio Posts...');
  const portfolioPosts = await db
    .collection('portfolioposts')
    .find({ $or: [
      ...CLOUD_NAMES.map(name => ({ 'images.url': { $regex: name } })),
    ]})
    .toArray();

  for (const post of portfolioPosts) {
    if (post.images && Array.isArray(post.images)) {
      for (const img of post.images) {
        if (img.url && hasOldCloud(img.url)) {
          urls.add(img.url);
        }
      }
    }
  }
  console.log(`   Found ${portfolioPosts.length} portfolio posts with old URLs`);

  // Forums
  console.log('💬 Checking Forums...');
  const forums = await db
    .collection('forums')
    .find(cloudRegexOr('imagePath'))
    .toArray();

  for (const forum of forums) {
    if (hasOldCloud(forum.imagePath)) {
      urls.add(forum.imagePath);
    }
  }
  console.log(`   Found ${forums.length} forums with old images`);

  // Categories
  console.log('📂 Checking Categories...');
  const categories = await db
    .collection('categories')
    .find(cloudRegexOr('image'))
    .toArray();

  for (const category of categories) {
    if (category.image) {
      urls.add(category.image);
    }
  }
  console.log(`   Found ${categories.length} categories with old URLs`);

  return urls;
}

/**
 * Main migration function
 */
async function runMigration() {
  const dryRun = process.argv.includes('--dry-run');
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined');
  }

  if (dryRun) {
    console.log('🧪 RUNNING IN DRY-RUN MODE - No uploads will be performed\n');
  }

  console.log('🚀 Starting Cloudinary Assets Migration (KEEP DB URLs)');
  console.log(`   Old clouds: ${CLOUD_NAMES.join(', ')}`);
  console.log(`   New cloud: ${NEW_CLOUD_NAME}`);
  console.log(`   Strategy: Copy all assets to new account with same paths`);
  console.log(`   Note: Old URLs will be fetched from latest old cloud (${CLOUD_NAMES[CLOUD_NAMES.length - 1]})\n`);
  console.log('='.repeat(80) + '\n');

  const client = new MongoClient(mongoUri);
  const stats: MigrationStats = {
    totalUrls: 0,
    successfulUploads: 0,
    failedUploads: 0,
    skippedUrls: 0,
    errors: [],
  };

  try {
    await client.connect();
    const db = client.db();
    console.log('✅ Connected to MongoDB\n');

    // Initialize cache (from progress file or empty for API checks)
    initializeCache();

    // Collect all URLs
    const allUrls = await getAllCloudinaryUrls(db);
    stats.totalUrls = allUrls.size;

    console.log(`\n📊 Total unique URLs to migrate: ${stats.totalUrls}\n`);
    console.log('='.repeat(80) + '\n');

    if (dryRun) {
      console.log(
        '🧪 DRY RUN - Showing first 5 URLs that would be migrated:\n',
      );
      let count = 0;
      for (const url of allUrls) {
        if (count >= 5) break;
        console.log(`${count + 1}. ${url}`);
        try {
          const { publicId, folder } = extractCloudinaryPath(url);
          console.log(`   → Public ID: ${publicId}`);
          console.log(`   → Folder: ${folder || 'root'}\n`);
        } catch (e) {
          console.log(`   ⚠️  Could not parse URL\n`);
        }
        count++;
      }
      console.log(`... and ${stats.totalUrls - 5} more URLs\n`);
      return;
    }

    // Migrate each URL
    let current = 0;
    for (const url of allUrls) {
      current++;
      console.log(`\n[${current}/${stats.totalUrls}] Processing URL:`);
      await migrateImage(url, stats);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    // Save progress even on failure
    saveProgress(existingResourcesCache);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB\n');
  }

  // Save final progress
  saveProgress(existingResourcesCache);

  // Print summary
  console.log('='.repeat(80));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total URLs processed: ${stats.totalUrls}`);
  console.log(`✅ Successful uploads: ${stats.successfulUploads}`);
  console.log(`⏭️  Skipped (already exist): ${stats.skippedUrls}`);
  console.log(`❌ Failed uploads: ${stats.failedUploads}`);
  console.log('='.repeat(80));

  if (stats.errors.length > 0) {
    console.log('\n⚠️  ERRORS:\n');
    stats.errors.forEach((err, index) => {
      console.log(`${index + 1}. ${err.url}`);
      console.log(`   Error: ${err.error}\n`);
    });
  }

  console.log('\n✅ Migration completed!');
  console.log('📌 Note: Database URLs remain unchanged');
  console.log(`📌 All assets are now copied to new account (${NEW_CLOUD_NAME})`);
  console.log('📌 The CloudinaryUrlInterceptor will transform URLs at runtime\n');
}

// Run migration
runMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
