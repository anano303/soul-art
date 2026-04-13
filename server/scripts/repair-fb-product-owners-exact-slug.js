#!/usr/bin/env node
const { MongoClient } = require('mongodb');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const PAGE_ID = process.env.FACEBOOK_POSTS_PAGE_ID || process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_POSTS_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const GRAPH_API = 'https://graph.facebook.com/v19.0';
const MAX_SCAN = 700;

const SLUG_ALIASES = {
  gskkart: 'giga-art',
};

const INVALID_TARGET_SLUGS = new Set(['soulart', 'soulart1']);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSlug(slug) {
  return String(slug || '').trim().toLowerCase();
}

function extractProductIds(text) {
  const ids = [];
  if (!text) return ids;
  const matches = text.matchAll(/soulart\.ge\/products?\/([a-f0-9]{24})/gi);
  for (const m of matches) ids.push(m[1].toLowerCase());
  return ids;
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

function resolveTargetSlug(authorSlug) {
  const normalized = normalizeSlug(authorSlug);
  return SLUG_ALIASES[normalized] || normalized;
}

async function fetchPosts(after = null) {
  const url = new URL(`${GRAPH_API}/${PAGE_ID}/published_posts`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  url.searchParams.set('limit', '100');
  url.searchParams.set('fields', 'id,message');
  if (after) url.searchParams.set('after', after);

  for (let i = 0; i < 5; i++) {
    try {
      const { data } = await axios.get(url.toString(), { timeout: 30000 });
      if (data.error) throw new Error(data.error.message);
      return data;
    } catch (e) {
      if (i === 4) throw e;
      await sleep((i + 1) * 1500);
    }
  }
}

async function fetchComments(postId) {
  try {
    const { data } = await axios.get(`${GRAPH_API}/${postId}/comments`, {
      params: { access_token: ACCESS_TOKEN, limit: 100 },
      timeout: 30000,
    });
    return data.data || [];
  } catch {
    return [];
  }
}

async function buildExactProductSlugMap() {
  const map = new Map();
  let after = null;
  let scanned = 0;

  while (scanned < MAX_SCAN) {
    const data = await fetchPosts(after);
    const posts = data.data || [];
    if (!posts.length) break;

    for (const post of posts) {
      scanned++;
      const authorSlug = extractAuthorSlug(post.message);
      if (!authorSlug) continue;

      for (const pid of extractProductIds(post.message)) {
        if (!map.has(pid)) map.set(pid, authorSlug);
      }

      const comments = await fetchComments(post.id);
      for (const comment of comments) {
        for (const pid of extractProductIds(comment.message)) {
          if (!map.has(pid)) map.set(pid, authorSlug);
        }
      }
    }

    if (data.paging?.cursors?.after && scanned < MAX_SCAN) {
      after = data.paging.cursors.after;
    } else {
      break;
    }
  }

  return map;
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const usersCol = db.collection('users');
  const productsCol = db.collection('products');

  const users = await usersCol
    .find(
      { artistSlug: { $exists: true, $nin: [null, ''] } },
      { projection: { _id: 1, artistSlug: 1, storeName: 1, name: 1 } },
    )
    .toArray();
  const userBySlug = new Map();
  for (const user of users) userBySlug.set(normalizeSlug(user.artistSlug), user);

  const productToAuthorSlug = await buildExactProductSlugMap();
  console.log('mapped_product_ids', productToAuthorSlug.size);

  let moved = 0;
  let unassignedMissingSlug = 0;
  let unassignedInvalidSlug = 0;
  let unchanged = 0;

  for (const [productId, authorSlug] of productToAuthorSlug.entries()) {
    const product = await productsCol.findOne({ _id: new (require('mongodb').ObjectId)(productId) });
    if (!product) continue;

    const currentOwner = product.user
      ? await usersCol.findOne({ _id: product.user }, { projection: { artistSlug: 1 } })
      : null;
    const currentSlug = normalizeSlug(currentOwner?.artistSlug || '');

    const resolvedSlug = resolveTargetSlug(authorSlug);

    if (INVALID_TARGET_SLUGS.has(resolvedSlug)) {
      if (product.user !== null) {
        await productsCol.updateOne(
          { _id: product._id },
          { $set: { user: null, brand: product.brand || '' } },
        );
        unassignedInvalidSlug++;
      } else {
        unchanged++;
      }
      continue;
    }

    const targetUser = userBySlug.get(resolvedSlug);
    if (!targetUser) {
      if (product.user !== null) {
        await productsCol.updateOne(
          { _id: product._id },
          { $set: { user: null, brand: product.brand || '' } },
        );
        unassignedMissingSlug++;
      } else {
        unchanged++;
      }
      continue;
    }

    if (currentSlug === resolvedSlug) {
      unchanged++;
      continue;
    }

    await productsCol.updateOne(
      { _id: product._id },
      {
        $set: {
          user: targetUser._id,
          brand: targetUser.storeName || targetUser.name || product.brand,
        },
      },
    );
    moved++;
  }

  console.log('SUMMARY', {
    moved,
    unassignedMissingSlug,
    unassignedInvalidSlug,
    unchanged,
  });

  await client.close();
}

main().catch((error) => {
  console.error('Fatal:', error.message);
  process.exit(1);
});
