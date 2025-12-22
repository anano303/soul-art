import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// All old cloud names (oldest first, latest old last)
const CLOUD_NAMES = ['dsufx8uzd', 'dwfqjtdu2'];
const NEW_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dmvh7vwpu';

// Helper to check if string contains any old cloud name
const hasOldCloud = (str: string) => str && CLOUD_NAMES.some(name => str.includes(name));

// Helper to build $or regex query for all old cloud names
const oldCloudRegex = (field: string) => ({ 
  $or: CLOUD_NAMES.map(name => ({ [field]: { $regex: name } })) 
});

interface CloudinaryStats {
  collection: string;
  field: string;
  oldCount: number;
  newCount: number;
  totalCount: number;
  sampleUrls: string[];
}

async function checkCloudinaryUrls() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  console.log('🔍 Connecting to MongoDB...');
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db();

    console.log('✅ Connected to MongoDB\n');

    const stats: CloudinaryStats[] = [];

    // Check Products collection - images array
    console.log('📦 Checking Products collection...');
    const products = db.collection('products');
    const productCount = await products.countDocuments();
    console.log(`   Total products: ${productCount}`);

    const productsWithOldUrls = await products.countDocuments(oldCloudRegex('images'));

    const productsWithNewUrls = await products.countDocuments({
      images: { $regex: NEW_CLOUD_NAME },
    });

    const sampleProducts = await products
      .find(oldCloudRegex('images'))
      .limit(3)
      .toArray();

    stats.push({
      collection: 'products',
      field: 'images',
      oldCount: productsWithOldUrls,
      newCount: productsWithNewUrls,
      totalCount: productCount,
      sampleUrls: sampleProducts
        .flatMap((p) => p.images || [])
        .filter((url: string) => hasOldCloud(url))
        .slice(0, 3),
    });

    // Check Products collection - thumbnail
    const productsWithOldThumbnail = await products.countDocuments(oldCloudRegex('thumbnail'));

    const productsWithNewThumbnail = await products.countDocuments({
      thumbnail: { $regex: NEW_CLOUD_NAME },
    });

    const sampleThumbnails = await products
      .find(oldCloudRegex('thumbnail'))
      .limit(3)
      .toArray();

    stats.push({
      collection: 'products',
      field: 'thumbnail',
      oldCount: productsWithOldThumbnail,
      newCount: productsWithNewThumbnail,
      totalCount: productCount,
      sampleUrls: sampleThumbnails
        .map((p) => p.thumbnail)
        .filter(Boolean)
        .slice(0, 3),
    });

    // Check Users collection - profilePicture
    console.log('👤 Checking Users collection...');
    const users = db.collection('users');
    const userCount = await users.countDocuments();
    console.log(`   Total users: ${userCount}`);

    const usersWithOldProfile = await users.countDocuments(oldCloudRegex('profilePicture'));

    const usersWithNewProfile = await users.countDocuments({
      profilePicture: { $regex: NEW_CLOUD_NAME },
    });

    const sampleUsers = await users
      .find(oldCloudRegex('profilePicture'))
      .limit(3)
      .toArray();

    stats.push({
      collection: 'users',
      field: 'profilePicture',
      oldCount: usersWithOldProfile,
      newCount: usersWithNewProfile,
      totalCount: userCount,
      sampleUrls: sampleUsers
        .map((u) => u.profilePicture)
        .filter(Boolean)
        .slice(0, 3),
    });

    // Check Banners collection
    console.log('🎨 Checking Banners collection...');
    const banners = db.collection('banners');
    const bannerCount = await banners.countDocuments();
    console.log(`   Total banners: ${bannerCount}`);

    const bannersWithOldImage = await banners.countDocuments(oldCloudRegex('imageUrl'));

    const bannersWithNewImage = await banners.countDocuments({
      imageUrl: { $regex: NEW_CLOUD_NAME },
    });

    const sampleBanners = await banners
      .find(oldCloudRegex('imageUrl'))
      .limit(3)
      .toArray();

    stats.push({
      collection: 'banners',
      field: 'imageUrl',
      oldCount: bannersWithOldImage,
      newCount: bannersWithNewImage,
      totalCount: bannerCount,
      sampleUrls: sampleBanners
        .map((b) => b.imageUrl)
        .filter(Boolean)
        .slice(0, 3),
    });

    // Check Blog Posts collection
    console.log('📝 Checking Blog Posts collection...');
    const blogs = db.collection('blogposts');
    const blogCount = await blogs.countDocuments();
    console.log(`   Total blog posts: ${blogCount}`);

    const blogsWithOldImage = await blogs.countDocuments(oldCloudRegex('image'));

    const blogsWithNewImage = await blogs.countDocuments({
      image: { $regex: NEW_CLOUD_NAME },
    });

    const sampleBlogs = await blogs
      .find(oldCloudRegex('image'))
      .limit(3)
      .toArray();

    stats.push({
      collection: 'blogposts',
      field: 'image',
      oldCount: blogsWithOldImage,
      newCount: blogsWithNewImage,
      totalCount: blogCount,
      sampleUrls: sampleBlogs
        .map((b) => b.image)
        .filter(Boolean)
        .slice(0, 3),
    });

    // Check Categories collection
    console.log('📂 Checking Categories collection...');
    const categories = db.collection('categories');
    const categoryCount = await categories.countDocuments();
    console.log(`   Total categories: ${categoryCount}`);

    const categoriesWithOldImage = await categories.countDocuments(oldCloudRegex('image'));

    const categoriesWithNewImage = await categories.countDocuments({
      image: { $regex: NEW_CLOUD_NAME },
    });

    const sampleCategories = await categories
      .find(oldCloudRegex('image'))
      .limit(3)
      .toArray();

    stats.push({
      collection: 'categories',
      field: 'image',
      oldCount: categoriesWithOldImage,
      newCount: categoriesWithNewImage,
      totalCount: categoryCount,
      sampleUrls: sampleCategories
        .map((c) => c.image)
        .filter(Boolean)
        .slice(0, 3),
    });

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 CLOUDINARY URL STATISTICS SUMMARY');
    console.log('='.repeat(80) + '\n');

    let totalOld = 0;
    let totalNew = 0;

    stats.forEach((stat) => {
      totalOld += stat.oldCount;
      totalNew += stat.newCount;

      console.log(`\n📌 ${stat.collection}.${stat.field}`);
      console.log(`   ❌ Old URLs (${CLOUD_NAMES.join(', ')}): ${stat.oldCount}`);
      console.log(`   ✅ New URLs (${NEW_CLOUD_NAME}): ${stat.newCount}`);
      console.log(`   📊 Total documents: ${stat.totalCount}`);

      if (stat.sampleUrls.length > 0) {
        console.log(`   🔗 Sample old URLs:`);
        stat.sampleUrls.forEach((url, index) => {
          console.log(`      ${index + 1}. ${url}`);
        });
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`🔢 TOTAL OLD URLs TO MIGRATE: ${totalOld}`);
    console.log(`✅ TOTAL NEW URLs ALREADY PRESENT: ${totalNew}`);
    console.log('='.repeat(80) + '\n');

    return stats;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the check
checkCloudinaryUrls()
  .then(() => {
    console.log('\n✅ Check completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });
