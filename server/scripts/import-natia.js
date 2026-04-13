#!/usr/bin/env node
/**
 * Import natiajanturidze products from FB page.
 * Uses published_posts endpoint. Dedup by FB post ID.
 * Re-uploads images to S3. Target: natiajanturidze user.
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
const USER_ID = '6912f0db231e458e759a80c3'; // natiajanturidze
const KEYWORD = 'natiajanturidze';

const s3 = new S3Client({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = 'soulart-s3';

function downloadImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(imageUrl);
    const client = parsed.protocol === 'https:' ? https : http;
    client
      .get(imageUrl, { headers: { 'User-Agent': 'SoulArt/1.0' } }, (res) => {
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
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
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
  return `https://${BUCKET}.s3.eu-north-1.amazonaws.com/${key}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPosts(after = null) {
  const url = new URL(
    `https://graph.facebook.com/v19.0/${PAGE_ID}/published_posts`,
  );
  url.searchParams.set('access_token', ACCESS_TOKEN);
  url.searchParams.set('limit', '100');
  url.searchParams.set(
    'fields',
    'id,message,created_time,full_picture,attachments{media,subattachments{media}}',
  );
  if (after) url.searchParams.set('after', after);

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.error) {
      console.log(`   ⏳ API retry ${attempt + 1}/5: ${data.error.message}`);
      await sleep((attempt + 1) * 3000);
      continue;
    }
    return data;
  }
  throw new Error('FB API failed after 5 retries');
}

function parsePostMessage(message) {
  const product = {};
  const lines = message.split('\n');

  const titleMatch = message.match(/📌\s*(.+)/);
  product.name = titleMatch ? titleMatch[1].trim() : 'უსათაურო';

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
    const isDecorator =
      /^[\p{Emoji}\p{Emoji_Component}\uFE0F\u200D\s]+$/u.test(line) &&
      line.length < 30;
    if (isStructured || isDecorator) break;
    descLines.push(line);
  }
  product.description = descLines.join('\n');
  product.isOriginal = message.includes('✅ ორიგინალი');

  const matMatch = message.match(/🎨\s*მასალა:\s*(.+)/);
  product.materials = matMatch
    ? matMatch[1]
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean)
    : [];

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

  const priceMatch = message.match(/💰\s*ფასი:\s*([\d.]+)/);
  product.price = priceMatch ? parseFloat(priceMatch[1]) : 0;

  const discountMatch = message.match(/🔻\s*ფასდაკლება:\s*(\d+)%/);
  if (discountMatch) {
    product.discountPercentage = parseInt(discountMatch[1]);
    const oldPriceMatch = message.match(/ძველი ფასი\s*([\d.]+)/);
    if (oldPriceMatch) product.price = parseFloat(oldPriceMatch[1]);
  }

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
  console.log(`🔍 Fetching all "${KEYWORD}" posts from FB page...\n`);
  const allPosts = [];
  const seenIds = new Set();
  let after = null;
  let totalScanned = 0;

  const MAX_SCAN = 700; // FB page has ~676 posts
  while (totalScanned < MAX_SCAN) {
    const data = await fetchPosts(after);
    if (!data.data || data.data.length === 0) break;
    for (const post of data.data) {
      totalScanned++;
      if (
        post.message &&
        post.message.toLowerCase().includes(KEYWORD.toLowerCase())
      ) {
        if (!seenIds.has(post.id)) {
          seenIds.add(post.id);
          allPosts.push(post);
        }
      }
    }
    console.log(
      `   Scanned ${totalScanned}, found ${allPosts.length} unique posts`,
    );
    if (
      data.paging?.cursors?.after &&
      data.data.length > 0 &&
      totalScanned < MAX_SCAN
    ) {
      after = data.paging.cursors.after;
      await sleep(150);
    } else break;
  }

  // Sort by created_time ascending (oldest first)
  allPosts.sort((a, b) => new Date(a.created_time) - new Date(b.created_time));

  console.log(
    `\n✅ Total: ${allPosts.length} unique posts (sorted by date ascending)\n`,
  );

  if (allPosts.length === 0) {
    console.log('No posts found!');
    return;
  }

  const products = allPosts.map((post) => {
    const parsed = parsePostMessage(post.message);
    const images = extractImages(post);
    return {
      ...parsed,
      images,
      fbPostId: post.id,
      createdTime: post.created_time,
    };
  });

  const withDesc = products.filter((p) => p.description.length > 0).length;
  console.log(
    `📊 ${products.length} products | ${withDesc} with desc | ${products.length - withDesc} without`,
  );
  console.log(`\nOldest: "${products[0].name}" (${products[0].createdTime})`);
  console.log(
    `Newest: "${products[products.length - 1].name}" (${products[products.length - 1].createdTime})\n`,
  );

  // Connect and clean old products
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const productsCol = db.collection('products');
  const userId = new ObjectId(USER_ID);

  const oldCount = await productsCol.countDocuments({ user: userId });
  if (oldCount > 0) {
    console.log(`🗑️  Deleting ${oldCount} old products...`);
    await productsCol.deleteMany({ user: userId });
  }

  console.log(
    `🚀 Inserting ${products.length} products for natiajanturidze...\n`,
  );

  let inserted = 0;
  for (let idx = 0; idx < products.length; idx++) {
    const p = products[idx];
    process.stdout.write(
      `📦 ${idx + 1}/${products.length}: ${p.name.substring(0, 40)} ... `,
    );

    const s3Images = [];
    for (let i = 0; i < p.images.length; i++) {
      try {
        const buffer = await downloadImage(p.images[i]);
        const s3Key = `products/natia-${Date.now()}-${idx}-${i}.jpg`;
        const s3Url = await uploadToS3(buffer, s3Key);
        s3Images.push(s3Url);
      } catch (err) {
        s3Images.push(p.images[i]);
      }
    }

    const doc = {
      user: userId,
      name: p.name,
      brand: 'ნათია ჭანტურიძე',
      description: p.description || p.name,
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
    console.log(`✅`);
  }

  console.log(`\n🎉 Done! ${inserted} products imported for @natiajanturidze`);
  await client.close();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
