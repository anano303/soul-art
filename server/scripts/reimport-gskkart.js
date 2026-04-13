#!/usr/bin/env node
/**
 * Re-import gskkart products from Facebook with FIXED description parsing.
 * 1. Deletes old imported products
 * 2. Fetches ALL gskkart posts (76 total)
 * 3. Correctly parses description (plain text after ✍️ line)
 * 4. Re-uploads images to S3
 * 5. Inserts to gskkart user
 */

const { MongoClient, ObjectId } = require('mongodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const MONGODB_URI =
  'mongodb+srv://soulartgeorgia_db_user:hzO24rdfnjaT6kWI@soulart.gacy33l.mongodb.net/?appName=SoulArt';
const PAGE_ID = '542501458957000';
const ACCESS_TOKEN =
  'EAAh5uzqZCKRIBP22uG9wc5sKNWz53S9gfuRzehCmVDcZAX6grP5X9XHU0eNY7wNoos9vXKc9Toq4qN2tXioAiGwalBZC93NQOj4u4nCE4doJQ2Rwp9HPH5Md4jUD0qIZAHoNoVjBHNZBa7xZCeByKykCXzxhe8ZAZCwSUupRku3qqiWv7vdUe068UX8ZBoutrK7n6ZAaBi';

const s3 = new S3Client({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = 'soulart-s3';
const REGION = 'eu-north-1';

const ARTIST_SLUG = 'gskkart';
const GSKKART_USER_ID = '6911b233231e458e759a0bde';
const GIGA_ART_USER_ID = '69d5f81b3b0ca78dc71c1e19';

// --- Helpers ---
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
            return downloadImage(res.headers.location)
              .then(resolve)
              .catch(reject);
          }
          if (res.statusCode !== 200)
            return reject(new Error(`HTTP ${res.statusCode}`));
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        },
      )
      .on('error', reject);
  });
}

async function uploadToS3(buffer, key) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    }),
  );
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPagePosts(after = null, retries = 3) {
  const url = new URL(`https://graph.facebook.com/v19.0/${PAGE_ID}/posts`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  url.searchParams.set('limit', '50'); // smaller batch to avoid rate limit
  url.searchParams.set(
    'fields',
    'id,message,created_time,full_picture,attachments{media,subattachments{media}}',
  );
  if (after) url.searchParams.set('after', after);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) {
    if (retries > 0 && data.error.message.includes('reduce the amount')) {
      console.log('   ⏳ Rate limited, waiting 5s...');
      await sleep(5000);
      return fetchPagePosts(after, retries - 1);
    }
    throw new Error(`FB API: ${data.error.message}`);
  }
  return data;
}

// --- FIXED Parser ---
function parsePostMessage(message) {
  const product = {};
  const lines = message.split('\n');

  // Title: 📌 ...
  const titleMatch = message.match(/📌\s*(.+)/);
  product.name = titleMatch ? titleMatch[1].trim() : 'უსათაურო';

  // Description: plain text lines after ✍️ line, before structured emoji fields
  // Structured fields start with: ✅, 🖼️, 🎨 მასალა, 📏, 💰, 🔻, ⏳, 🔗, 👤, #
  const descLines = [];
  let foundAuthor = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('✍️')) {
      foundAuthor = true;
      continue;
    }

    if (!foundAuthor) continue;

    // Check if this is a structured field or decorator
    const isStructured =
      line.startsWith('✅') ||
      line.startsWith('🖼️') ||
      (line.startsWith('🎨') && line.includes('მასალა')) ||
      line.startsWith('📏') ||
      line.startsWith('💰') ||
      line.startsWith('🔻') ||
      line.startsWith('⏳') ||
      line.startsWith('🔗') ||
      line.startsWith('👤') ||
      line.startsWith('#');

    // Check if it's just emoji decorators (e.g. 🎨🎨🎨🎨🎨)
    const isDecorator =
      /^[\p{Emoji}\p{Emoji_Component}\uFE0F\u200D\s]+$/u.test(line) &&
      line.length < 30;

    if (isStructured || isDecorator) {
      // Stop collecting description
      break;
    }

    // This is a plain text description line
    descLines.push(line);
  }
  product.description = descLines.join('\n');

  // isOriginal
  product.isOriginal = message.includes('✅ ორიგინალი');

  // Materials
  const matMatch = message.match(/🎨\s*მასალა:\s*(.+)/);
  product.materials = matMatch
    ? matMatch[1]
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean)
    : [];

  // Dimensions
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

  // Price
  const priceMatch = message.match(/💰\s*ფასი:\s*([\d.]+)/);
  product.price = priceMatch ? parseFloat(priceMatch[1]) : 0;

  // Discount
  const discountMatch = message.match(/🔻\s*ფასდაკლება:\s*(\d+)%/);
  if (discountMatch) {
    product.discountPercentage = parseInt(discountMatch[1]);
    const oldPriceMatch = message.match(/ძველი ფასი\s*([\d.]+)/);
    if (oldPriceMatch) product.price = parseFloat(oldPriceMatch[1]);
  }

  // Hashtags
  const hashtags = [];
  const tagRegex = /#([\p{L}\p{N}_-]+)/gu;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(message)) !== null)
    hashtags.push(tagMatch[1]);
  product.hashtags = hashtags;

  return product;
}

function extractImages(post) {
  const images = [];
  const attachments = post.attachments?.data || [];
  for (const att of attachments) {
    const subs = att.subattachments?.data || [];
    for (const sub of subs) {
      if (sub.media?.image?.src) images.push(sub.media.image.src);
    }
    if (subs.length === 0 && att.media?.image?.src)
      images.push(att.media.image.src);
  }
  if (images.length === 0 && post.full_picture) images.push(post.full_picture);
  return images;
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const productsCol = db.collection('products');

  // --- Step 1: Delete old imported products ---
  console.log('🗑️  Deleting old imported products...');
  const oldGskkartId = new ObjectId(GSKKART_USER_ID);
  const oldGigaArtId = new ObjectId(GIGA_ART_USER_ID);

  // Delete from both users (we moved some from gskkart to giga-art earlier)
  const del1 = await productsCol.deleteMany({ user: oldGskkartId });
  const del2 = await productsCol.deleteMany({ user: oldGigaArtId });
  console.log(
    `   Deleted ${del1.deletedCount} from gskkart, ${del2.deletedCount} from giga-art`,
  );

  // --- Step 2: Fetch ALL gskkart posts ---
  console.log('\n🔍 Fetching ALL gskkart posts from Facebook...');
  const allPosts = [];
  let after = null;
  let totalScanned = 0;
  const MAX_SCAN = 2000; // Limit - after 1600 posts we have all unique ones
  while (totalScanned < MAX_SCAN) {
    const data = await fetchPagePosts(after);
    if (!data.data || data.data.length === 0) break;
    for (const post of data.data) {
      totalScanned++;
      if (post.message && post.message.toLowerCase().includes('gskkart')) {
        allPosts.push(post);
      }
    }
    console.log(
      `   Scanned ${totalScanned}, found ${allPosts.length} gskkart posts...`,
    );
    if (data.paging?.cursors?.after && data.data.length >= 1) {
      after = data.paging.cursors.after;
      await sleep(500); // Small delay between pages to avoid rate limit
    } else break;
  }

  // Deduplicate by product name (same product posted to page + groups)
  const seen = new Set();
  const uniquePosts = [];
  for (const post of allPosts) {
    const titleMatch = post.message.match(/📌\s*(.+)/);
    const title = titleMatch ? titleMatch[1].trim().toLowerCase() : '';
    if (title && !seen.has(title)) {
      seen.add(title);
      // Prefer the post with more text (likely has description)
      uniquePosts.push(post);
    } else if (title && seen.has(title)) {
      // Check if this version has more content (description)
      const existingIdx = uniquePosts.findIndex((p) => {
        const t = p.message.match(/📌\s*(.+)/);
        return t && t[1].trim().toLowerCase() === title;
      });
      if (
        existingIdx >= 0 &&
        post.message.length > uniquePosts[existingIdx].message.length
      ) {
        uniquePosts[existingIdx] = post; // Replace with longer version (has description)
      }
    }
  }

  console.log(`\n✅ Found ${uniquePosts.length} unique gskkart posts\n`);

  // --- Step 3: Parse and preview ---
  const products = [];
  for (const post of uniquePosts) {
    const parsed = parsePostMessage(post.message);
    const images = extractImages(post);
    products.push({
      ...parsed,
      images,
      fbPostId: post.id,
      createdTime: post.created_time,
    });
  }

  console.log('--- Preview (first 5) ---\n');
  for (let i = 0; i < Math.min(5, products.length); i++) {
    const p = products[i];
    console.log(`${i + 1}. "${p.name}"`);
    console.log(`   Desc: "${p.description.substring(0, 100) || '(ცარიელი)'}"`);
    console.log(
      `   Price: ₾${p.price} | Materials: ${p.materials.join(', ') || 'N/A'} | Images: ${p.images.length}`,
    );
  }
  console.log('\n--- Last 3 ---\n');
  for (let i = Math.max(0, products.length - 3); i < products.length; i++) {
    const p = products[i];
    console.log(`${i + 1}. "${p.name}"`);
    console.log(`   Desc: "${p.description.substring(0, 100) || '(ცარიელი)'}"`);
    console.log(
      `   Price: ₾${p.price} | Materials: ${p.materials.join(', ') || 'N/A'} | Images: ${p.images.length}`,
    );
  }

  const withDesc = products.filter((p) => p.description.length > 0).length;
  const withoutDesc = products.filter((p) => p.description.length === 0).length;
  console.log(
    `\n📊 ${withDesc} with description, ${withoutDesc} without description`,
  );

  // --- Step 4: Confirm ---
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise((resolve) =>
    rl.question(
      `\n❓ Insert ${products.length} products for gskkart? (y/n): `,
      resolve,
    ),
  );
  rl.close();
  if (answer.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    await client.close();
    return;
  }

  // --- Step 5: Import ---
  const userId = oldGskkartId;
  let inserted = 0;
  for (let idx = 0; idx < products.length; idx++) {
    const p = products[idx];
    console.log(`\n📦 ${idx + 1}/${products.length}: ${p.name}`);

    // Re-upload images
    const s3Images = [];
    for (let i = 0; i < p.images.length; i++) {
      try {
        console.log(`     📥 Image ${i + 1}/${p.images.length}...`);
        const buffer = await downloadImage(p.images[i]);
        const s3Key = `products/gskkart-${Date.now()}-${idx}-${i}.jpg`;
        const s3Url = await uploadToS3(buffer, s3Key);
        s3Images.push(s3Url);
      } catch (err) {
        console.warn(`     ⚠️ Failed: ${err.message}`);
        s3Images.push(p.images[i]);
      }
    }

    const doc = {
      user: userId,
      name: p.name,
      brand: 'GSKKART',
      description: p.description || p.name, // fallback: use name if no description
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
    console.log(
      `   ✅ ID: ${result.insertedId}${p.description ? ' (has desc)' : ' (no desc)'}`,
    );
  }

  console.log(`\n🎉 Done! ${inserted} products imported for gskkart.`);
  await client.close();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
