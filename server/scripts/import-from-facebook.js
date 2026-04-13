#!/usr/bin/env node
/**
 * Import products from Facebook page posts by keyword search.
 * Finds posts matching "gskkart", parses product info from the auto-post format,
 * re-uploads images to S3, and inserts them into MongoDB.
 *
 * Usage:
 *   node scripts/import-from-facebook.js
 */

const { MongoClient } = require('mongodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const http = require('http');
const path = require('path');
const { URL } = require('url');

// --- Config from .env ---
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://soulartgeorgia_db_user:hzO24rdfnjaT6kWI@soulart.gacy33l.mongodb.net/?appName=SoulArt';
const PAGE_ID =
  process.env.FACEBOOK_POSTS_PAGE_ID ||
  process.env.FACEBOOK_PAGE_ID ||
  '542501458957000';
const ACCESS_TOKEN =
  process.env.FACEBOOK_POSTS_PAGE_ACCESS_TOKEN ||
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
  'EAAh5uzqZCKRIBP22uG9wc5sKNWz53S9gfuRzehCmVDcZAX6grP5X9XHU0eNY7wNoos9vXKc9Toq4qN2tXioAiGwalBZC93NQOj4u4nCE4doJQ2Rwp9HPH5Md4jUD0qIZAHoNoVjBHNZBa7xZCeByKykCXzxhe8ZAZCwSUupRku3qqiWv7vdUe068UX8ZBoutrK7n6ZAaBi';

// S3
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_BUCKET_NAME || 'soulart-s3';
const REGION = process.env.AWS_REGION || 'eu-north-1';

const SEARCH_KEYWORD = 'gskkart';
const ARTIST_SLUG = 'gskkart';
const BATCH_SIZE = 100;

// --- Download image to buffer ---
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    client
      .get(
        url,
        { headers: { 'User-Agent': 'SoulArt-Importer/1.0' } },
        (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            // Follow redirect
            return downloadImage(res.headers.location)
              .then(resolve)
              .catch(reject);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          }
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        },
      )
      .on('error', reject);
  });
}

// --- Upload to S3 ---
async function uploadToS3(buffer, key, contentType = 'image/jpeg') {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

// --- Facebook API helpers ---
async function fetchPagePosts(after = null) {
  const url = new URL(`https://graph.facebook.com/v19.0/${PAGE_ID}/posts`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  url.searchParams.set('limit', BATCH_SIZE.toString());
  url.searchParams.set(
    'fields',
    'id,message,created_time,full_picture,attachments{media,subattachments{media}}',
  );
  if (after) url.searchParams.set('after', after);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(`FB API: ${data.error.message}`);
  return data;
}

async function getAllMatchingPosts() {
  console.log(`\n🔍 Searching FB page posts for "${SEARCH_KEYWORD}"...\n`);
  const matched = [];
  let after = null;
  let totalScanned = 0;

  while (true) {
    const data = await fetchPagePosts(after);
    if (!data.data || data.data.length === 0) break;

    for (const post of data.data) {
      totalScanned++;
      if (
        post.message &&
        post.message.toLowerCase().includes(SEARCH_KEYWORD.toLowerCase())
      ) {
        matched.push(post);
      }
    }

    console.log(
      `  Scanned ${totalScanned} posts, found ${matched.length} matches so far...`,
    );

    if (data.paging?.cursors?.after && data.data.length === BATCH_SIZE) {
      after = data.paging.cursors.after;
    } else {
      break;
    }
  }

  console.log(
    `\n✅ Found ${matched.length} posts out of ${totalScanned} total.\n`,
  );
  return matched;
}

// --- Post message parser ---
function parsePostMessage(message) {
  const product = {};

  // Title: 📌 ...
  const titleMatch = message.match(/📌\s*(.+)/);
  product.name = titleMatch ? titleMatch[1].trim() : 'უსათაურო';

  // Description: text after author line, before structured fields
  const lines = message
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const descLines = [];
  let capture = false;
  for (const line of lines) {
    if (line.startsWith('✍️')) {
      capture = true;
      continue;
    }
    if (
      capture &&
      !line.startsWith('✅') &&
      !line.startsWith('🖼️') &&
      !line.startsWith('🎨') &&
      !line.startsWith('📏') &&
      !line.startsWith('💰') &&
      !line.startsWith('🔻') &&
      !line.startsWith('⏳') &&
      !line.startsWith('🔗') &&
      !line.startsWith('👤') &&
      !line.startsWith('#')
    ) {
      descLines.push(line);
    } else if (capture && descLines.length > 0) {
      capture = false;
    }
  }
  product.description = descLines.join('\n') || '';

  // Original status
  product.isOriginal = message.includes('✅ ორიგინალი');

  // Materials: 🎨 მასალა: ...
  const matMatch = message.match(/🎨\s*მასალა:\s*(.+)/);
  product.materials = matMatch
    ? matMatch[1]
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean)
    : [];

  // Dimensions: 📏 ზომა: W×H სმ (or W×H×D)
  const dimMatch = message.match(
    /📏\s*ზომა:\s*([\d.]+)[×xX*]([\d.]+)(?:[×xX*]([\d.]+))?\s*სმ/i,
  );
  if (dimMatch) {
    product.dimensions = {
      width: parseFloat(dimMatch[1]),
      height: parseFloat(dimMatch[2]),
    };
    if (dimMatch[3]) product.dimensions.depth = parseFloat(dimMatch[3]);
  }

  // Price: 💰 ფასი: 180₾
  const priceMatch = message.match(/💰\s*ფასი:\s*([\d.]+)/);
  product.price = priceMatch ? parseFloat(priceMatch[1]) : 0;

  // Discount: 🔻 ფასდაკლება: N%
  const discountMatch = message.match(/🔻\s*ფასდაკლება:\s*(\d+)%/);
  if (discountMatch) {
    product.discountPercentage = parseInt(discountMatch[1]);
    const oldPriceMatch = message.match(/ძველი ფასი\s*([\d.]+)/);
    if (oldPriceMatch) product.price = parseFloat(oldPriceMatch[1]);
  }

  // Hashtags: #tag1 #tag2
  const hashtags = [];
  const tagRegex = /#([\p{L}\p{N}_-]+)/gu;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(message)) !== null) {
    hashtags.push(tagMatch[1]);
  }
  product.hashtags = hashtags;

  return product;
}

// --- Extract image URLs from FB post ---
function extractImages(post) {
  const images = [];

  const attachments = post.attachments?.data || [];
  for (const att of attachments) {
    const subs = att.subattachments?.data || [];
    for (const sub of subs) {
      if (sub.media?.image?.src) images.push(sub.media.image.src);
    }
    if (subs.length === 0 && att.media?.image?.src) {
      images.push(att.media.image.src);
    }
  }

  if (images.length === 0 && post.full_picture) {
    images.push(post.full_picture);
  }

  return images;
}

// --- Re-upload FB images to S3 ---
async function reuploadImages(fbImageUrls, productIndex) {
  const s3Urls = [];
  for (let i = 0; i < fbImageUrls.length; i++) {
    try {
      console.log(
        `     📥 Downloading image ${i + 1}/${fbImageUrls.length}...`,
      );
      const buffer = await downloadImage(fbImageUrls[i]);
      const s3Key = `products/fb-import-${Date.now()}-${productIndex}-${i}.jpg`;
      const s3Url = await uploadToS3(buffer, s3Key);
      s3Urls.push(s3Url);
      console.log(`     ☁️  Uploaded to S3: ${s3Key}`);
    } catch (err) {
      console.warn(`     ⚠️  Failed to re-upload image: ${err.message}`);
      // Keep FB URL as fallback
      s3Urls.push(fbImageUrls[i]);
    }
  }
  return s3Urls;
}

// --- Main ---
async function main() {
  // 1. Fetch matching posts from Facebook
  const posts = await getAllMatchingPosts();
  if (posts.length === 0) {
    console.log('No matching posts found. Exiting.');
    return;
  }

  // 2. Connect to MongoDB
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB');
  const db = client.db();
  const usersCol = db.collection('users');
  const productsCol = db.collection('products');

  // 3. Find the artist by slug
  const artist = await usersCol.findOne({ artistSlug: ARTIST_SLUG });
  if (!artist) {
    console.error(
      `\n❌ Artist with slug "${ARTIST_SLUG}" not found in database!`,
    );
    console.log('\nAvailable artists with slugs:');
    const artists = await usersCol
      .find({ artistSlug: { $exists: true, $ne: null } })
      .project({ name: 1, artistSlug: 1 })
      .toArray();
    if (artists.length === 0) {
      console.log('  (no artists with slugs found)');
    } else {
      artists.forEach((a) => console.log(`  - ${a.name} (${a.artistSlug})`));
    }
    await client.close();
    return;
  }
  console.log(
    `\n🎨 Artist: ${artist.name} (slug: ${artist.artistSlug}, id: ${artist._id})\n`,
  );

  // 4. Parse each post
  const products = [];
  for (const post of posts) {
    const parsed = parsePostMessage(post.message);
    const images = extractImages(post);
    products.push({
      ...parsed,
      images,
      fbPostId: post.id,
      createdTime: post.created_time,
    });
  }

  // Preview
  console.log('--- Products to import ---\n');
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    console.log(`${i + 1}. ${p.name}`);
    console.log(`   Price: ₾${p.price}`);
    console.log(`   Materials: ${p.materials.join(', ') || 'N/A'}`);
    console.log(
      `   Dimensions: ${p.dimensions ? `${p.dimensions.width}×${p.dimensions.height}` : 'N/A'}`,
    );
    console.log(`   Images: ${p.images.length}`);
    console.log(`   Original: ${p.isOriginal}`);
    console.log(`   Hashtags: ${p.hashtags.join(', ') || 'N/A'}`);
    console.log(
      `   Description: ${p.description.substring(0, 100)}${p.description.length > 100 ? '...' : ''}`,
    );
    console.log();
  }

  // 5. Confirm before inserting
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise((resolve) =>
    rl.question(
      `\n❓ Insert ${products.length} products for ${artist.name}? (y/n): `,
      resolve,
    ),
  );
  rl.close();

  if (answer.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    await client.close();
    return;
  }

  // 6. Re-upload images to S3 and insert products
  let inserted = 0;
  for (let idx = 0; idx < products.length; idx++) {
    const p = products[idx];
    console.log(`\n📦 ${idx + 1}/${products.length}: ${p.name}`);

    // Re-upload images to S3 (FB CDN URLs expire)
    const s3Images = await reuploadImages(p.images, idx);

    const doc = {
      user: artist._id,
      name: p.name,
      brand: artist.storeName || artist.name || ARTIST_SLUG,
      description: p.description,
      price: p.price,
      images: s3Images,
      category: 'ნახატები',
      countInStock: 1,
      status: 'APPROVED',
      reviews: [],
      rating: 0,
      numReviews: 0,
      hashtags: p.hashtags || [],
      deliveryType: 'SoulArt',
      materials: p.materials || [],
      materialsEn: [],
      dimensions: p.dimensions || {},
      isOriginal: p.isOriginal !== false,
      hideFromStore: false,
      viewCount: 0,
      variants: [],
      ageGroups: [],
      sizes: [],
      colors: [],
      colorsEn: [],
      discountPercentage: p.discountPercentage || 0,
      referralDiscountPercent: 0,
      useArtistDefaultDiscount: false,
      createdAt: new Date(p.createdTime || Date.now()),
      updatedAt: new Date(),
    };

    const result = await productsCol.insertOne(doc);
    inserted++;
    console.log(`   ✅ Inserted — ID: ${result.insertedId}`);
  }

  console.log(`\n🎉 Done! ${inserted} products imported for ${artist.name}.`);
  await client.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
