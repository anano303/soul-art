#!/usr/bin/env node
const { MongoClient, ObjectId } = require('mongodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const path = require('path');
const axios = require('axios');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const PAGE_ID = process.env.FACEBOOK_POSTS_PAGE_ID || process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN =
  process.env.FACEBOOK_POSTS_PAGE_ACCESS_TOKEN ||
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const MAX_SCAN = 700;
const PAINTINGS_CATEGORY_ID = '68768f6f0b55154655a8e882';
const ABSTRACTION_SUBCATEGORY_ID = '68768f990b55154655a8e89d';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME || 'soulart-s3';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSlug(slug) {
  return String(slug || '').trim().toLowerCase();
}

function extractAuthorSlug(message) {
  if (!message) return null;
  const lines = String(message).split('\n');
  const authorLine = lines.find((line) => line.includes('✍️')) || '';

  const inParens = authorLine.match(/\(([^)]+)\)/);
  if (inParens && inParens[1]) return normalizeSlug(inParens[1]);

  const mention = String(message).match(/@([a-z0-9._-]+)/i);
  if (mention && mention[1]) return normalizeSlug(mention[1]);

  return null;
}

function extractOriginalProductId(text) {
  const match = String(text || '').match(/soulart\.ge\/products?\/([a-f0-9]{24})/i);
  return match ? match[1] : null;
}

function parsePostMessage(message) {
  const product = {};
  const text = String(message || '');
  const lines = text.split('\n');

  const titleMatch = text.match(/📌\s*(.+)/);
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
  product.isOriginal = text.includes('✅ ორიგინალი');

  const materialMatch = text.match(/🎨\s*მასალა:\s*(.+)/);
  product.materials = materialMatch
    ? materialMatch[1]
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const dimensionMatch = text.match(
    /📏\s*ზომა:\s*([\d.]+)[×xX*]([\d.]+)(?:[×xX*]([\d.]+))?\s*სმ/i,
  );
  if (dimensionMatch) {
    product.dimensions = {
      width: parseFloat(dimensionMatch[1]),
      height: parseFloat(dimensionMatch[2]),
    };
    if (dimensionMatch[3]) {
      product.dimensions.depth = parseFloat(dimensionMatch[3]);
    }
  }

  const priceMatch = text.match(/💰\s*ფასი:\s*([\d.]+)/);
  product.price = priceMatch ? parseFloat(priceMatch[1]) : 0;

  const hashtags = [];
  const tagRegex = /#([\p{L}\p{N}_-]+)/gu;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    hashtags.push(tagMatch[1]);
  }
  product.hashtags = hashtags;

  return product;
}

function extractImages(post) {
  const images = [];
  const attachments = post.attachments?.data || [];

  for (const attachment of attachments) {
    const subattachments = attachment.subattachments?.data || [];
    for (const subattachment of subattachments) {
      if (subattachment.media?.image?.src) {
        images.push(subattachment.media.image.src);
      }
    }
    if (subattachments.length === 0 && attachment.media?.image?.src) {
      images.push(attachment.media.image.src);
    }
  }

  if (images.length === 0 && post.full_picture) {
    images.push(post.full_picture);
  }

  return images;
}

async function fetchPosts(after = null) {
  const url = new URL(`${GRAPH_API}/${PAGE_ID}/published_posts`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  url.searchParams.set('limit', '100');
  url.searchParams.set(
    'fields',
    'id,message,created_time,full_picture,attachments{media,subattachments{media}}',
  );
  if (after) {
    url.searchParams.set('after', after);
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.error) {
        console.log(`API retry ${attempt + 1}/5: ${data.error.message}`);
        await sleep((attempt + 1) * 3000);
        continue;
      }
      return data;
    } catch (error) {
      console.log(`Network retry ${attempt + 1}/5: ${error.message}`);
      await sleep((attempt + 1) * 3000);
    }
  }

  throw new Error('Facebook API failed after 5 retries');
}

async function fetchAllPagePosts() {
  const allPosts = [];
  let after = null;
  let scanned = 0;

  while (scanned < MAX_SCAN) {
    const data = await fetchPosts(after);
    if (!data.data || data.data.length === 0) break;

    for (const post of data.data) {
      allPosts.push(post);
      scanned++;
    }

    if (
      data.paging?.cursors?.after &&
      data.data.length > 0 &&
      scanned < MAX_SCAN
    ) {
      after = data.paging.cursors.after;
      await sleep(120);
    } else {
      break;
    }
  }

  return allPosts;
}

async function fetchComments(postId) {
  try {
    const response = await axios.get(`${GRAPH_API}/${postId}/comments`, {
      params: {
        access_token: ACCESS_TOKEN,
        limit: 100,
      },
    });
    return response.data.data || [];
  } catch {
    return [];
  }
}

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
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
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

  return `https://${BUCKET}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${key}`;
}

async function main() {
  const targetSlug = normalizeSlug(process.argv[2] || '');
  if (!targetSlug) {
    throw new Error('Usage: node scripts/import-missing-single-slug.js <artistSlug>');
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  const usersCol = db.collection('users');
  const productsCol = db.collection('products');

  const seller = await usersCol.findOne(
    { role: 'seller', artistSlug: targetSlug },
    { projection: { _id: 1, name: 1, storeName: 1, artistSlug: 1 } },
  );

  if (!seller) {
    console.log(`Seller not found for slug: ${targetSlug}`);
    await client.close();
    return;
  }

  console.log(`Scanning Facebook page posts for slug: ${targetSlug}`);
  const allPosts = await fetchAllPagePosts();
  console.log(`Fetched ${allPosts.length} page posts`);

  const matches = allPosts
    .filter((post) => post.message && extractAuthorSlug(post.message) === targetSlug)
    .sort((a, b) => new Date(a.created_time) - new Date(b.created_time));

  console.log(`Matching Facebook posts: ${matches.length}`);

  const existingProducts = await productsCol
    .find({ user: seller._id }, { projection: { _id: 1 } })
    .toArray();
  const existingIds = new Set(existingProducts.map((p) => String(p._id)));

  let imported = 0;
  let skippedExisting = 0;
  let skippedNoId = 0;
  let conflicts = 0;
  let failed = 0;

  for (let index = 0; index < matches.length; index++) {
    try {
      const post = matches[index];
      const parsed = parsePostMessage(post.message);

      let originalId = extractOriginalProductId(post.message);
      if (!originalId) {
        const comments = await fetchComments(post.id);
        for (const comment of comments) {
          const commentId = extractOriginalProductId(comment.message);
          if (commentId) {
            originalId = commentId;
            break;
          }
        }
      }

      if (!originalId) {
        skippedNoId++;
        continue;
      }

      if (existingIds.has(originalId)) {
        skippedExisting++;
        continue;
      }

      const existingById = await productsCol.findOne(
        { _id: new ObjectId(originalId) },
        { projection: { _id: 1, user: 1 } },
      );
      if (existingById) {
        conflicts++;
        continue;
      }

      process.stdout.write(`[${index + 1}/${matches.length}] ${targetSlug}: ${parsed.name} ... `);

      const originalImages = extractImages(post);
      const s3Images = [];
      for (let imageIndex = 0; imageIndex < originalImages.length; imageIndex++) {
        try {
          const buffer = await downloadImage(originalImages[imageIndex]);
          const key = `products/${targetSlug}-${originalId}-${imageIndex}.jpg`;
          const s3Url = await uploadToS3(buffer, key);
          s3Images.push(s3Url);
        } catch {
          s3Images.push(originalImages[imageIndex]);
        }
      }

      const doc = {
        _id: new ObjectId(originalId),
        user: seller._id,
        name: parsed.name,
        brand: seller.storeName || seller.name,
        description: parsed.description || parsed.name,
        price: parsed.price,
        images: s3Images,
        category: 'ნახატები',
        mainCategory: new ObjectId(PAINTINGS_CATEGORY_ID),
        mainCategoryEn: 'Painting',
        subCategory: new ObjectId(ABSTRACTION_SUBCATEGORY_ID),
        subCategoryEn: 'Abstraction',
        countInStock: 1,
        status: 'APPROVED',
        reviews: [],
        rating: 0,
        numReviews: 0,
        hashtags: parsed.hashtags || [],
        deliveryType: 'SoulArt',
        materials: parsed.materials || [],
        materialsEn: [],
        dimensions: parsed.dimensions || {},
        isOriginal: parsed.isOriginal !== false,
        hideFromStore: false,
        viewCount: 0,
        variants: [],
        ageGroups: [],
        sizes: [],
        colors: [],
        colorsEn: [],
        discountPercentage: 0,
        referralDiscountPercent: 0,
        useArtistDefaultDiscount: false,
        createdAt: new Date(post.created_time || Date.now()),
        updatedAt: new Date(),
      };

      await productsCol.insertOne(doc);
      existingIds.add(originalId);
      imported++;
      console.log('OK');
    } catch (error) {
      failed++;
      console.log(`FAILED: ${error.message}`);
    }
  }

  const finalCount = await productsCol.countDocuments({ user: seller._id });
  console.log('SUMMARY', {
    slug: targetSlug,
    matchingPosts: matches.length,
    imported,
    skippedExisting,
    skippedNoId,
    conflicts,
    failed,
    finalCount,
  });

  await client.close();
}

main().catch((error) => {
  console.error('Fatal:', error);
  process.exit(1);
});
