import { v2 as cloudinary, UploadApiOptions } from 'cloudinary';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const OLD_CLOUD_NAME = 'dsufx8uzd';
const NEW_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dwfqjtdu2';

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

    console.log(`   📥 Source URL: ${url}`);
    console.log(`      Public ID: ${publicId}`);
    console.log(`      Folder: ${folder || 'root'}`);

    try {
      await cloudinary.api.resource(publicId, {
        resource_type: resourceType as any,
        type: 'upload',
      });
      console.log(`   ⏭️  Already exists in new account, skipping`);
      stats.skippedUrls++;
      return true;
    } catch (lookupError: any) {
      if (lookupError?.http_code && lookupError.http_code !== 404) {
        console.warn(
          `   ⚠️  Failed to check existence: ${lookupError.message}`,
        );
      }
    }

    const { buffer, contentType } = await downloadImage(url, format);
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
    const newUrl = url.replace(OLD_CLOUD_NAME, NEW_CLOUD_NAME);
    console.log(`      New URL: ${newUrl}`);
    stats.successfulUploads++;
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

  // Products - images array
  console.log('📦 Checking Products...');
  const products = await db
    .collection('products')
    .find({
      images: { $regex: OLD_CLOUD_NAME },
    })
    .toArray();

  for (const product of products) {
    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        if (img.includes(OLD_CLOUD_NAME)) {
          // Remove transformations to get base URL
          const baseUrl =
            img.split('/upload/')[0] + '/upload/' + img.split('/upload/')[1];
          urls.add(img);
        }
      }
    }
    // Add brandLogo if exists
    if (product.brandLogo && product.brandLogo.includes(OLD_CLOUD_NAME)) {
      urls.add(product.brandLogo);
    }
  }
  console.log(`   Found ${products.length} products with old URLs`);

  // Products - thumbnail
  const productsWithThumbnail = await db
    .collection('products')
    .find({
      thumbnail: { $regex: OLD_CLOUD_NAME },
    })
    .toArray();

  for (const product of productsWithThumbnail) {
    if (product.thumbnail) {
      urls.add(product.thumbnail);
    }
  }
  console.log(
    `   Found ${productsWithThumbnail.length} products with old thumbnails`,
  );

  // Banners
  console.log('🎨 Checking Banners...');
  const banners = await db
    .collection('banners')
    .find({
      imageUrl: { $regex: OLD_CLOUD_NAME },
    })
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
    .find({
      $or: [
        { profileImagePath: { $regex: OLD_CLOUD_NAME } },
        { storeLogo: { $regex: OLD_CLOUD_NAME } },
        { storeLogoPath: { $regex: OLD_CLOUD_NAME } },
        { artistCoverImage: { $regex: OLD_CLOUD_NAME } },
        { artistGallery: { $regex: OLD_CLOUD_NAME } },
      ],
    })
    .toArray();

  for (const user of users) {
    if (
      user.profileImagePath &&
      user.profileImagePath.includes(OLD_CLOUD_NAME)
    ) {
      urls.add(user.profileImagePath);
    }
    if (user.storeLogo && user.storeLogo.includes(OLD_CLOUD_NAME)) {
      urls.add(user.storeLogo);
    }
    if (user.storeLogoPath && user.storeLogoPath.includes(OLD_CLOUD_NAME)) {
      urls.add(user.storeLogoPath);
    }
    if (
      user.artistCoverImage &&
      user.artistCoverImage.includes(OLD_CLOUD_NAME)
    ) {
      urls.add(user.artistCoverImage);
    }
    // Artist Gallery - array of images
    if (user.artistGallery && Array.isArray(user.artistGallery)) {
      for (const img of user.artistGallery) {
        if (img && img.includes(OLD_CLOUD_NAME)) {
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
    .find({
      $or: [
        { coverImage: { $regex: OLD_CLOUD_NAME } },
        { images: { $regex: OLD_CLOUD_NAME } },
      ],
    })
    .toArray();

  for (const blog of blogs) {
    if (blog.coverImage && blog.coverImage.includes(OLD_CLOUD_NAME)) {
      urls.add(blog.coverImage);
    }
    if (blog.images && Array.isArray(blog.images)) {
      for (const img of blog.images) {
        if (img.includes(OLD_CLOUD_NAME)) {
          urls.add(img);
        }
      }
    }
  }
  console.log(`   Found ${blogs.length} blog posts with old URLs`);

  // Forums
  console.log('💬 Checking Forums...');
  const forums = await db
    .collection('forums')
    .find({
      imagePath: { $regex: OLD_CLOUD_NAME },
    })
    .toArray();

  for (const forum of forums) {
    if (forum.imagePath && forum.imagePath.includes(OLD_CLOUD_NAME)) {
      urls.add(forum.imagePath);
    }
  }
  console.log(`   Found ${forums.length} forums with old images`);

  // Categories
  console.log('📂 Checking Categories...');
  const categories = await db
    .collection('categories')
    .find({
      image: { $regex: OLD_CLOUD_NAME },
    })
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
  console.log(`   Old cloud: ${OLD_CLOUD_NAME}`);
  console.log(`   New cloud: ${NEW_CLOUD_NAME}`);
  console.log(`   Strategy: Copy all assets to new account with same paths`);
  console.log(
    `   Database: URLs will NOT be changed (remain ${OLD_CLOUD_NAME})\n`,
  );
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
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB\n');
  }

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
  console.log('📌 Note: Database URLs remain unchanged (dsufx8uzd)');
  console.log('📌 All assets are now in new account (dwfqjtdu2)');
  console.log('📌 Configure cloudinary provider to use new credentials\n');
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
