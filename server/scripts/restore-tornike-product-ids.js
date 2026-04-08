#!/usr/bin/env node
/**
 * Restore original product IDs for tornikeotiashvili from FB post body/comments.
 * Matches imported docs by name + price and swaps _id with old ID from post links.
 */
const { MongoClient, ObjectId } = require('mongodb');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const PAGE_ID = process.env.FACEBOOK_POSTS_PAGE_ID || process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_POSTS_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const API = 'https://graph.facebook.com/v19.0';
const ARTIST_SLUG = 'tornikeotiashvili';
const USER_ID = '68e8fe72f10079410087add2';
const MAX_SCAN = 700;

async function fetchAllPosts(url, allPosts = []) {
  const res = await axios.get(url);
  const posts = res.data.data || [];
  allPosts.push(...posts);
  if (allPosts.length >= MAX_SCAN || !res.data.paging?.next) return allPosts;
  return fetchAllPosts(res.data.paging.next, allPosts);
}

async function fetchComments(postId) {
  try {
    const res = await axios.get(`${API}/${postId}/comments`, {
      params: { access_token: ACCESS_TOKEN, limit: 100 },
    });
    return res.data.data || [];
  } catch {
    return [];
  }
}

function isArtistPost(msg) {
  const text = String(msg || '').toLowerCase();
  return (
    text.includes(`(${ARTIST_SLUG})`) ||
    text.includes(`@${ARTIST_SLUG}`) ||
    text.includes(ARTIST_SLUG)
  );
}

function parseTitle(msg) {
  const m = String(msg || '').match(/📌\s*(.+)/);
  return m ? m[1].trim() : null;
}

function parsePrice(msg) {
  const m = String(msg || '').match(/💰\s*ფასი:\s*([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

function extractProductId(text) {
  const m = String(text || '').match(/soulart\.ge\/products?\/([a-f0-9]{24})/i);
  return m ? m[1] : null;
}

async function main() {
  console.log(`Fetching FB posts for ${ARTIST_SLUG}...`);
  const url = `${API}/${PAGE_ID}/published_posts?fields=id,message,created_time&limit=100&access_token=${ACCESS_TOKEN}`;
  const allPosts = await fetchAllPosts(url, []);
  const artistPosts = allPosts.filter((p) => isArtistPost(p.message));
  console.log(`Scanned ${allPosts.length}, matched ${artistPosts.length} posts`);

  const fbEntries = [];

  for (let i = 0; i < artistPosts.length; i++) {
    const post = artistPosts[i];
    const title = parseTitle(post.message);
    const price = parsePrice(post.message);

    let originalId = extractProductId(post.message);
    if (!originalId) {
      const comments = await fetchComments(post.id);
      for (const c of comments) {
        const cid = extractProductId(c.message);
        if (cid) {
          originalId = cid;
          break;
        }
      }
    }

    if (originalId && title) {
      fbEntries.push({ originalId, title, price, createdTime: post.created_time });
    }
  }

  console.log(`Found ${fbEntries.length} post-linked product IDs`);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const productsCol = db.collection('products');
  const userObjId = new ObjectId(USER_ID);

  const currentProducts = await productsCol.find({ user: userObjId }).toArray();
  console.log(`Current DB products: ${currentProducts.length}`);
  const usedCurrentIds = new Set();

  let restored = 0;
  let alreadyCorrect = 0;
  let noMatch = 0;

  for (const fb of fbEntries) {
    const oldIdObj = new ObjectId(fb.originalId);
    const existingByOldId = await productsCol.findOne({ _id: oldIdObj });

    if (existingByOldId) {
      if (existingByOldId.user.toString() === USER_ID) {
        alreadyCorrect++;
      }
      continue;
    }

    let candidates = currentProducts.filter((p) => {
      if (usedCurrentIds.has(String(p._id))) return false;
      if (p.name !== fb.title) return false;
      if (fb.price == null) return true;
      return Math.abs(Number(p.price || 0) - fb.price) < 1;
    });

    // Fallback: when multiple same-name posts exist, match by createdAt timestamp from FB.
    if (candidates.length === 0 && fb.createdTime) {
      const fbTs = new Date(fb.createdTime).getTime();
      candidates = currentProducts.filter((p) => {
        if (usedCurrentIds.has(String(p._id))) return false;
        if (!p.createdAt) return false;
        const docTs = new Date(p.createdAt).getTime();
        const closeByTime = Math.abs(docTs - fbTs) <= 120000;
        return closeByTime;
      });
    }

    if (candidates.length === 0) {
      noMatch++;
      continue;
    }

    const doc = candidates[0];
    const newDoc = { ...doc, _id: oldIdObj };

    try {
      await productsCol.insertOne(newDoc);
      await productsCol.deleteOne({ _id: doc._id });
      restored++;
      usedCurrentIds.add(String(doc._id));

      const idx = currentProducts.findIndex((x) => String(x._id) === String(doc._id));
      if (idx !== -1) currentProducts.splice(idx, 1);
    } catch {
      noMatch++;
    }
  }

  console.log(`Restored: ${restored}`);
  console.log(`Already correct: ${alreadyCorrect}`);
  console.log(`Unmatched: ${noMatch}`);

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
