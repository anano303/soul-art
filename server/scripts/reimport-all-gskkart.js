#!/usr/bin/env node
/**
 * Clean reimport: ALL gskkart FB posts -> giga-art user
 * NO deduplication by name. Fixed description parsing.
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

const GIGA_ART_USER_ID = '69d5f81b3b0ca78dc71c1e19'; // @giga-art
const GSKKART_USER_ID = '6911b233231e458e759a0bde'; // old gskkart

const s3 = new S3Client({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = 'soulart-s3';

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    client
      .get(url, { headers: { 'User-Agent': 'SoulArt/1.0' } }, (res) => {
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

async function fetchPagePosts(after = null) {
  const url = new URL(`https://graph.facebook.com/v19.0/${PAGE_ID}/posts`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  url.searchParams.set('limit', '25');
  url.searchParams.set(
    'fields',
    'id,message,created_time,full_picture,attachments{media,subattachments{media}}',
  );
  if (after) url.searchParams.set('after', after);

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.error) {
      console.log(
        `   ⏳ API error, waiting ${(attempt + 1) * 3}s... (${data.error.message})`,
      );
      await sleep((attempt + 1) * 3000);
      continue;
    }
    return data;
  }
  throw new Error('FB API failed after 5 retries');
}

// FIXED: description = plain text after ✍️ author line, before emoji-structured fields
function parsePostMessage(message) {
  const product = {};
  const lines = message.split('\n');

  const titleMatch = message.match(/📌\s*(.+)/);
  product.name = titleMatch ? titleMatch[1].trim() : 'უსათაურო';

  // Description: text after ✍️ line, stop at structured emoji fields or decorator-only lines
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

    // Pure emoji decorator lines like 🎨🎨🎨🎨
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
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const productsCol = db.collection('products');
  const gigaArtId = new ObjectId(GIGA_ART_USER_ID);
  const gskkartId = new ObjectId(GSKKART_USER_ID);

  // Step 1: Delete old imported products from BOTH users
  console.log('🗑️  Cleaning old imports...');
  const del1 = await productsCol.deleteMany({ user: gigaArtId });
  const del2 = await productsCol.deleteMany({ user: gskkartId });
  console.log(
    `   Deleted ${del1.deletedCount} (giga-art) + ${del2.deletedCount} (gskkart)`,
  );

  // Step 2: Fetch ALL gskkart posts from FB page
  console.log('\n🔍 Fetching ALL gskkart posts...');
  const allPosts = [];
  let after = null;
  let totalScanned = 0;

  while (true) {
    const data = await fetchPagePosts(after);
    if (!data.data || data.data.length === 0) break;
    for (const post of data.data) {
      totalScanned++;
      if (post.message && post.message.toLowerCase().includes('gskkart')) {
        allPosts.push(post);
      }
    }
    console.log(
      `   Scanned ${totalScanned}, found ${allPosts.length} gskkart posts`,
    );
    if (data.paging?.cursors?.after && data.data.length > 0) {
      after = data.paging.cursors.after;
      await sleep(300);
    } else break;
  }

  console.log(
    `\n✅ Total: ${allPosts.length} gskkart posts (NO dedup, importing ALL)\n`,
  );

  // Step 3: Parse all
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

  // Preview
  const withDesc = products.filter((p) => p.description.length > 0).length;
  console.log(
    `📊 ${withDesc} with description, ${products.length - withDesc} without`,
  );
  console.log('\nFirst 3:');
  for (let i = 0; i < Math.min(3, products.length); i++) {
    const p = products[i];
    console.log(
      `  ${i + 1}. "${p.name}" | ₾${p.price} | imgs:${p.images.length} | desc:"${(p.description || '').substring(0, 60)}"`,
    );
  }
  console.log('Last 3:');
  for (let i = Math.max(0, products.length - 3); i < products.length; i++) {
    const p = products[i];
    console.log(
      `  ${i + 1}. "${p.name}" | ₾${p.price} | imgs:${p.images.length} | desc:"${(p.description || '').substring(0, 60)}"`,
    );
  }

  // Step 4: Auto-confirm (Y)
  console.log(`\n🚀 Inserting ${products.length} products for @giga-art...\n`);

  // Step 5: Import all to giga-art
  let inserted = 0;
  for (let idx = 0; idx < products.length; idx++) {
    const p = products[idx];
    process.stdout.write(`📦 ${idx + 1}/${products.length}: ${p.name} ... `);

    const s3Images = [];
    for (let i = 0; i < p.images.length; i++) {
      try {
        const buffer = await downloadImage(p.images[i]);
        const s3Key = `products/giga-art-${Date.now()}-${idx}-${i}.jpg`;
        const s3Url = await uploadToS3(buffer, s3Key);
        s3Images.push(s3Url);
      } catch (err) {
        s3Images.push(p.images[i]); // fallback to FB URL
      }
    }

    const doc = {
      user: gigaArtId,
      name: p.name,
      brand: 'GSKKART',
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
    console.log(`✅ ${result.insertedId}`);
  }

  console.log(`\n🎉 Done! ${inserted} products imported for @giga-art`);
  await client.close();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
