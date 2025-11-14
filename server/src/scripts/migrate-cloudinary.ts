import { v2 as cloudinary } from 'cloudinary';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const OLD_CLOUD_NAME = 'dsufx8uzd';
const NEW_CLOUD_NAME = 'dwfqjtdu2';

// Configure new Cloudinary account
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface MigrationResult {
  collection: string;
  field: string;
  totalProcessed: number;
  successfulMigrations: number;
  failedMigrations: number;
  skipped: number;
  errors: Array<{ documentId: string; error: string }>;
}

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      })
      .on('error', reject);
  });
}

/**
 * Upload image to new Cloudinary account
 */
async function uploadToNewCloudinary(
  imageUrl: string,
  folder: string,
): Promise<string> {
  try {
    console.log(`   📥 Downloading: ${imageUrl}`);
    const imageBuffer = await downloadImage(imageUrl);

    console.log(`   📤 Uploading to new Cloudinary account...`);
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
      {
        folder: folder,
        resource_type: 'auto',
      },
    );

    console.log(`   ✅ Uploaded: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error(`   ❌ Failed to migrate: ${error.message}`);
    throw error;
  }
}

/**
 * Migrate products collection
 */
async function migrateProducts(
  db: any,
  dryRun: boolean = false,
): Promise<MigrationResult> {
  console.log('\n📦 Migrating Products...');
  const collection = db.collection('products');

  const result: MigrationResult = {
    collection: 'products',
    field: 'images + thumbnail',
    totalProcessed: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    skipped: 0,
    errors: [],
  };

  const products = await collection
    .find({
      $or: [
        { images: { $regex: OLD_CLOUD_NAME } },
        { thumbnail: { $regex: OLD_CLOUD_NAME } },
      ],
    })
    .toArray();

  console.log(`   Found ${products.length} products to migrate`);

  for (const product of products) {
    result.totalProcessed++;
    console.log(
      `\n   📌 Product [${result.totalProcessed}/${products.length}]: ${product.name} (${product._id})`,
    );

    try {
      const updates: any = {};
      let hasUpdates = false;

      // Migrate images array
      if (product.images && Array.isArray(product.images)) {
        const newImages: string[] = [];
        for (const imageUrl of product.images) {
          if (imageUrl.includes(OLD_CLOUD_NAME)) {
            if (dryRun) {
              console.log(`   [DRY RUN] Would migrate image: ${imageUrl}`);
              newImages.push(imageUrl.replace(OLD_CLOUD_NAME, NEW_CLOUD_NAME));
            } else {
              const newUrl = await uploadToNewCloudinary(imageUrl, 'ecommerce');
              newImages.push(newUrl);
            }
            hasUpdates = true;
          } else {
            newImages.push(imageUrl);
          }
        }
        if (hasUpdates) {
          updates.images = newImages;
        }
      }

      // Migrate thumbnail
      if (product.thumbnail && product.thumbnail.includes(OLD_CLOUD_NAME)) {
        if (dryRun) {
          console.log(
            `   [DRY RUN] Would migrate thumbnail: ${product.thumbnail}`,
          );
          updates.thumbnail = product.thumbnail.replace(
            OLD_CLOUD_NAME,
            NEW_CLOUD_NAME,
          );
        } else {
          updates.thumbnail = await uploadToNewCloudinary(
            product.thumbnail,
            'ecommerce',
          );
        }
        hasUpdates = true;
      }

      if (hasUpdates && !dryRun) {
        await collection.updateOne({ _id: product._id }, { $set: updates });
        result.successfulMigrations++;
        console.log(`   ✅ Updated product ${product._id}`);
      } else if (dryRun && hasUpdates) {
        result.successfulMigrations++;
        console.log(`   [DRY RUN] Would update product ${product._id}`);
      } else {
        result.skipped++;
      }
    } catch (error) {
      result.failedMigrations++;
      result.errors.push({
        documentId: product._id.toString(),
        error: error.message,
      });
      console.error(
        `   ❌ Failed to migrate product ${product._id}:`,
        error.message,
      );
    }
  }

  return result;
}

/**
 * Migrate users collection
 */
async function migrateUsers(
  db: any,
  dryRun: boolean = false,
): Promise<MigrationResult> {
  console.log('\n👤 Migrating Users...');
  const collection = db.collection('users');

  const result: MigrationResult = {
    collection: 'users',
    field: 'profilePicture',
    totalProcessed: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    skipped: 0,
    errors: [],
  };

  const users = await collection
    .find({
      profilePicture: { $regex: OLD_CLOUD_NAME },
    })
    .toArray();

  console.log(`   Found ${users.length} users to migrate`);

  for (const user of users) {
    result.totalProcessed++;
    console.log(
      `\n   📌 User [${result.totalProcessed}/${users.length}]: ${user.email} (${user._id})`,
    );

    try {
      if (dryRun) {
        console.log(
          `   [DRY RUN] Would migrate profile picture: ${user.profilePicture}`,
        );
        result.successfulMigrations++;
      } else {
        const newUrl = await uploadToNewCloudinary(
          user.profilePicture,
          'users',
        );
        await collection.updateOne(
          { _id: user._id },
          { $set: { profilePicture: newUrl } },
        );
        result.successfulMigrations++;
        console.log(`   ✅ Updated user ${user._id}`);
      }
    } catch (error) {
      result.failedMigrations++;
      result.errors.push({
        documentId: user._id.toString(),
        error: error.message,
      });
      console.error(`   ❌ Failed to migrate user ${user._id}:`, error.message);
    }
  }

  return result;
}

/**
 * Migrate banners collection
 */
async function migrateBanners(
  db: any,
  dryRun: boolean = false,
): Promise<MigrationResult> {
  console.log('\n🎨 Migrating Banners...');
  const collection = db.collection('banners');

  const result: MigrationResult = {
    collection: 'banners',
    field: 'imageUrl',
    totalProcessed: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    skipped: 0,
    errors: [],
  };

  const banners = await collection
    .find({
      imageUrl: { $regex: OLD_CLOUD_NAME },
    })
    .toArray();

  console.log(`   Found ${banners.length} banners to migrate`);

  for (const banner of banners) {
    result.totalProcessed++;
    console.log(
      `\n   📌 Banner [${result.totalProcessed}/${banners.length}]: ${banner.title} (${banner._id})`,
    );

    try {
      if (dryRun) {
        console.log(`   [DRY RUN] Would migrate image: ${banner.imageUrl}`);
        result.successfulMigrations++;
      } else {
        const newUrl = await uploadToNewCloudinary(banner.imageUrl, 'banners');
        await collection.updateOne(
          { _id: banner._id },
          { $set: { imageUrl: newUrl } },
        );
        result.successfulMigrations++;
        console.log(`   ✅ Updated banner ${banner._id}`);
      }
    } catch (error) {
      result.failedMigrations++;
      result.errors.push({
        documentId: banner._id.toString(),
        error: error.message,
      });
      console.error(
        `   ❌ Failed to migrate banner ${banner._id}:`,
        error.message,
      );
    }
  }

  return result;
}

/**
 * Migrate blog posts collection
 */
async function migrateBlogs(
  db: any,
  dryRun: boolean = false,
): Promise<MigrationResult> {
  console.log('\n📝 Migrating Blog Posts...');
  const collection = db.collection('blogposts');

  const result: MigrationResult = {
    collection: 'blogposts',
    field: 'image',
    totalProcessed: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    skipped: 0,
    errors: [],
  };

  const blogs = await collection
    .find({
      image: { $regex: OLD_CLOUD_NAME },
    })
    .toArray();

  console.log(`   Found ${blogs.length} blog posts to migrate`);

  for (const blog of blogs) {
    result.totalProcessed++;
    console.log(
      `\n   📌 Blog [${result.totalProcessed}/${blogs.length}]: ${blog.title} (${blog._id})`,
    );

    try {
      if (dryRun) {
        console.log(`   [DRY RUN] Would migrate image: ${blog.image}`);
        result.successfulMigrations++;
      } else {
        const newUrl = await uploadToNewCloudinary(blog.image, 'blog');
        await collection.updateOne(
          { _id: blog._id },
          { $set: { image: newUrl } },
        );
        result.successfulMigrations++;
        console.log(`   ✅ Updated blog post ${blog._id}`);
      }
    } catch (error) {
      result.failedMigrations++;
      result.errors.push({
        documentId: blog._id.toString(),
        error: error.message,
      });
      console.error(
        `   ❌ Failed to migrate blog post ${blog._id}:`,
        error.message,
      );
    }
  }

  return result;
}

/**
 * Migrate categories collection
 */
async function migrateCategories(
  db: any,
  dryRun: boolean = false,
): Promise<MigrationResult> {
  console.log('\n📂 Migrating Categories...');
  const collection = db.collection('categories');

  const result: MigrationResult = {
    collection: 'categories',
    field: 'image',
    totalProcessed: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    skipped: 0,
    errors: [],
  };

  const categories = await collection
    .find({
      image: { $regex: OLD_CLOUD_NAME },
    })
    .toArray();

  console.log(`   Found ${categories.length} categories to migrate`);

  for (const category of categories) {
    result.totalProcessed++;
    console.log(
      `\n   📌 Category [${result.totalProcessed}/${categories.length}]: ${category.name} (${category._id})`,
    );

    try {
      if (dryRun) {
        console.log(`   [DRY RUN] Would migrate image: ${category.image}`);
        result.successfulMigrations++;
      } else {
        const newUrl = await uploadToNewCloudinary(
          category.image,
          'categories',
        );
        await collection.updateOne(
          { _id: category._id },
          { $set: { image: newUrl } },
        );
        result.successfulMigrations++;
        console.log(`   ✅ Updated category ${category._id}`);
      }
    } catch (error) {
      result.failedMigrations++;
      result.errors.push({
        documentId: category._id.toString(),
        error: error.message,
      });
      console.error(
        `   ❌ Failed to migrate category ${category._id}:`,
        error.message,
      );
    }
  }

  return result;
}

/**
 * Migrate portfolio posts collection
 */
async function migratePortfolioPosts(
  db: any,
  dryRun: boolean = false,
): Promise<MigrationResult> {
  console.log('\n📸 Migrating Portfolio Posts...');
  const collection = db.collection('portfolioposts');

  const result: MigrationResult = {
    collection: 'portfolioposts',
    field: 'images.url',
    totalProcessed: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    skipped: 0,
    errors: [],
  };

  const posts = await collection
    .find({
      'images.url': { $regex: OLD_CLOUD_NAME },
    })
    .toArray();

  console.log(`   Found ${posts.length} portfolio posts to migrate`);

  for (const post of posts) {
    result.totalProcessed++;
    console.log(
      `\n   📌 Portfolio Post [${result.totalProcessed}/${posts.length}] (${post._id})`,
    );

    try {
      const updates: any = {};
      let hasUpdates = false;

      // Migrate images array
      if (post.images && Array.isArray(post.images)) {
        const newImages: any[] = [];
        for (const image of post.images) {
          if (image.url && image.url.includes(OLD_CLOUD_NAME)) {
            if (dryRun) {
              console.log(`   [DRY RUN] Would migrate image: ${image.url}`);
              newImages.push({
                ...image,
                url: image.url.replace(OLD_CLOUD_NAME, NEW_CLOUD_NAME),
              });
            } else {
              const newUrl = await uploadToNewCloudinary(image.url, 'ecommerce');
              newImages.push({
                ...image,
                url: newUrl,
              });
            }
            hasUpdates = true;
          } else {
            newImages.push(image);
          }
        }
        if (hasUpdates) {
          updates.images = newImages;
        }
      }

      if (hasUpdates && !dryRun) {
        await collection.updateOne({ _id: post._id }, { $set: updates });
        result.successfulMigrations++;
        console.log(`   ✅ Updated portfolio post ${post._id}`);
      } else if (dryRun && hasUpdates) {
        result.successfulMigrations++;
        console.log(`   [DRY RUN] Would update portfolio post ${post._id}`);
      } else {
        result.skipped++;
      }
    } catch (error) {
      result.failedMigrations++;
      result.errors.push({
        documentId: post._id.toString(),
        error: error.message,
      });
      console.error(
        `   ❌ Failed to migrate portfolio post ${post._id}:`,
        error.message,
      );
    }
  }

  return result;
}

/**
 * Migrate gallery likes collection
 */
async function migrateGalleryLikes(
  db: any,
  dryRun: boolean = false,
): Promise<MigrationResult> {
  console.log('\n❤️  Migrating Gallery Likes...');
  const collection = db.collection('gallerylikes');

  const result: MigrationResult = {
    collection: 'gallerylikes',
    field: 'imageUrl',
    totalProcessed: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    skipped: 0,
    errors: [],
  };

  const likes = await collection
    .find({
      imageUrl: { $regex: OLD_CLOUD_NAME },
    })
    .toArray();

  console.log(`   Found ${likes.length} gallery likes to migrate`);

  for (const like of likes) {
    result.totalProcessed++;
    console.log(
      `\n   📌 Gallery Like [${result.totalProcessed}/${likes.length}] (${like._id})`,
    );

    try {
      if (like.imageUrl && like.imageUrl.includes(OLD_CLOUD_NAME)) {
        if (dryRun) {
          console.log(`   [DRY RUN] Would migrate imageUrl: ${like.imageUrl}`);
          result.successfulMigrations++;
        } else {
          const newUrl = await uploadToNewCloudinary(like.imageUrl, 'ecommerce');
          await collection.updateOne(
            { _id: like._id },
            { $set: { imageUrl: newUrl } },
          );
          result.successfulMigrations++;
          console.log(`   ✅ Updated gallery like ${like._id}`);
        }
      } else {
        result.skipped++;
      }
    } catch (error) {
      result.failedMigrations++;
      result.errors.push({
        documentId: like._id.toString(),
        error: error.message,
      });
      console.error(
        `   ❌ Failed to migrate gallery like ${like._id}:`,
        error.message,
      );
    }
  }

  return result;
}

/**
 * Migrate gallery comments collection
 */
async function migrateGalleryComments(
  db: any,
  dryRun: boolean = false,
): Promise<MigrationResult> {
  console.log('\n💬 Migrating Gallery Comments...');
  const collection = db.collection('gallerycomments');

  const result: MigrationResult = {
    collection: 'gallerycomments',
    field: 'imageUrl',
    totalProcessed: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    skipped: 0,
    errors: [],
  };

  const comments = await collection
    .find({
      imageUrl: { $regex: OLD_CLOUD_NAME },
    })
    .toArray();

  console.log(`   Found ${comments.length} gallery comments to migrate`);

  for (const comment of comments) {
    result.totalProcessed++;
    console.log(
      `\n   📌 Gallery Comment [${result.totalProcessed}/${comments.length}] (${comment._id})`,
    );

    try {
      if (comment.imageUrl && comment.imageUrl.includes(OLD_CLOUD_NAME)) {
        if (dryRun) {
          console.log(`   [DRY RUN] Would migrate imageUrl: ${comment.imageUrl}`);
          result.successfulMigrations++;
        } else {
          const newUrl = await uploadToNewCloudinary(comment.imageUrl, 'ecommerce');
          await collection.updateOne(
            { _id: comment._id },
            { $set: { imageUrl: newUrl } },
          );
          result.successfulMigrations++;
          console.log(`   ✅ Updated gallery comment ${comment._id}`);
        }
      } else {
        result.skipped++;
      }
    } catch (error) {
      result.failedMigrations++;
      result.errors.push({
        documentId: comment._id.toString(),
        error: error.message,
      });
      console.error(
        `   ❌ Failed to migrate gallery comment ${comment._id}:`,
        error.message,
      );
    }
  }

  return result;
}

/**
 * Main migration function
 */
async function runMigration() {
  const dryRun = process.argv.includes('--dry-run');
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  if (dryRun) {
    console.log('🧪 RUNNING IN DRY-RUN MODE - No changes will be made\n');
  }

  console.log('🚀 Starting Cloudinary Migration...');
  console.log(`   Old account: ${OLD_CLOUD_NAME}`);
  console.log(`   New account: ${NEW_CLOUD_NAME}\n`);
  console.log('='.repeat(80));

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db();
    console.log('✅ Connected to MongoDB\n');

    const results: MigrationResult[] = [];

    // Run migrations
    results.push(await migrateProducts(db, dryRun));
    results.push(await migrateUsers(db, dryRun));
    results.push(await migrateBanners(db, dryRun));
    results.push(await migrateBlogs(db, dryRun));
    results.push(await migrateCategories(db, dryRun));
    results.push(await migratePortfolioPosts(db, dryRun));
    results.push(await migrateGalleryLikes(db, dryRun));
    results.push(await migrateGalleryComments(db, dryRun));

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(80) + '\n');

    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    results.forEach((result) => {
      totalProcessed += result.totalProcessed;
      totalSuccess += result.successfulMigrations;
      totalFailed += result.failedMigrations;
      totalSkipped += result.skipped;

      console.log(`\n📌 ${result.collection}.${result.field}`);
      console.log(`   📊 Processed: ${result.totalProcessed}`);
      console.log(`   ✅ Successful: ${result.successfulMigrations}`);
      console.log(`   ❌ Failed: ${result.failedMigrations}`);
      console.log(`   ⏭️  Skipped: ${result.skipped}`);

      if (result.errors.length > 0) {
        console.log(`   ⚠️  Errors:`);
        result.errors.forEach((err) => {
          console.log(`      - ${err.documentId}: ${err.error}`);
        });
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`📊 TOTAL PROCESSED: ${totalProcessed}`);
    console.log(`✅ TOTAL SUCCESSFUL: ${totalSuccess}`);
    console.log(`❌ TOTAL FAILED: ${totalFailed}`);
    console.log(`⏭️  TOTAL SKIPPED: ${totalSkipped}`);
    console.log('='.repeat(80) + '\n');

    if (dryRun) {
      console.log('🧪 DRY RUN COMPLETED - No changes were made');
      console.log(
        '   Run without --dry-run flag to perform actual migration\n',
      );
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
