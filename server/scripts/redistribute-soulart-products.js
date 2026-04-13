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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  // Preferred pattern: ავტორი: Name (slug)
  const inParens = authorLine.match(/\(([^)]+)\)/);
  if (inParens && inParens[1]) return inParens[1].trim().toLowerCase();

  // Fallback: @slug anywhere in message
  const mention = String(message).match(/@([a-z0-9._-]+)/i);
  if (mention && mention[1]) return mention[1].trim().toLowerCase();

  return null;
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
      console.log(`fetchPosts retry ${i + 1}/5: ${e.message}`);
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

async function buildProductToSlugMap() {
  const map = new Map();
  let after = null;
  let scanned = 0;
  let withAuthorSlug = 0;

  while (scanned < MAX_SCAN) {
    const data = await fetchPosts(after);
    const posts = data.data || [];
    if (!posts.length) break;

    for (const post of posts) {
      scanned++;
      const authorSlug = extractAuthorSlug(post.message);
      if (authorSlug) withAuthorSlug++;

      // IDs in post body
      for (const pid of extractProductIds(post.message)) {
        if (!map.has(pid) && authorSlug) map.set(pid, authorSlug);
      }

      // IDs in comments
      const comments = await fetchComments(post.id);
      for (const c of comments) {
        for (const pid of extractProductIds(c.message)) {
          if (!map.has(pid) && authorSlug) map.set(pid, authorSlug);
        }
      }

      if (scanned % 25 === 0) {
        console.log(
          `mapped scan progress: ${scanned}/${MAX_SCAN}, authorSlugs: ${withAuthorSlug}, productIds: ${map.size}`,
        );
      }
    }

    if (data.paging?.cursors?.after && scanned < MAX_SCAN) {
      after = data.paging.cursors.after;
    } else {
      break;
    }
  }

  console.log(
    `mapping complete: scanned=${scanned}, authorSlugs=${withAuthorSlug}, mappedProductIds=${map.size}`,
  );
  return map;
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const usersCol = db.collection('users');
  const productsCol = db.collection('products');

  const soulartUser = await usersCol.findOne({ artistSlug: 'soulart' });
  if (!soulartUser) throw new Error('soulart user not found');

  const sellers = await usersCol
    .find({ role: 'seller', artistSlug: { $exists: true, $nin: [null, ''] } }, { projection: { _id: 1, artistSlug: 1, storeName: 1, name: 1 } })
    .toArray();

  const userBySlug = new Map();
  for (const s of sellers) userBySlug.set(String(s.artistSlug).toLowerCase(), s);

  const soulartProducts = await productsCol.find({ user: soulartUser._id }).toArray();
  console.log('soulart_products_before:', soulartProducts.length);

  const productToSlug = await buildProductToSlugMap();
  console.log('fb_product_slug_map_size:', productToSlug.size);

  let moved = 0;
  let deletedNoSlug = 0;
  let deletedMissingArtist = 0;
  let deletedSelf = 0;
  let processed = 0;

  for (const p of soulartProducts) {
    processed++;
    const pid = String(p._id).toLowerCase();
    const slug = productToSlug.get(pid);

    if (!slug) {
      await productsCol.deleteOne({ _id: p._id });
      deletedNoSlug++;
      continue;
    }

    const target = userBySlug.get(slug);
    if (!target) {
      await productsCol.deleteOne({ _id: p._id });
      deletedMissingArtist++;
      continue;
    }

    if (slug === 'soulart') {
      await productsCol.deleteOne({ _id: p._id });
      deletedSelf++;
      continue;
    }

    await productsCol.updateOne(
      { _id: p._id },
      {
        $set: {
          user: target._id,
          brand: target.storeName || target.name || p.brand,
        },
      },
    );
    moved++;

    if (processed % 25 === 0) {
      console.log(
        `redistribute progress: ${processed}/${soulartProducts.length}, moved=${moved}, deletedNoSlug=${deletedNoSlug}, deletedMissingArtist=${deletedMissingArtist}, deletedSelf=${deletedSelf}`,
      );
    }
  }

  const soulartAfter = await productsCol.countDocuments({ user: soulartUser._id });
  console.log('SUMMARY', {
    moved,
    deletedNoSlug,
    deletedMissingArtist,
    deletedSelf,
    soulartAfter,
  });

  await client.close();
}

main().catch((error) => {
  console.error('Fatal:', error.message);
  process.exit(1);
});
