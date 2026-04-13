'use strict';
/**
 * DRY-RUN scanner: Find all FB posts that belong to an artist slug,
 * show what product IDs they have (or that they're missing IDs).
 * Does NOT write to DB.
 */

const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const axios = require('axios');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const PAGE_ID = process.env.FACEBOOK_POSTS_PAGE_ID || process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_POSTS_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const GRAPH_API = 'https://graph.facebook.com/v19.0';
const MAX_SCAN = 700;

const TARGET_SLUG = process.argv[2] || 'tamar-aladashvili';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractAuthorSlug(message) {
  if (!message) return null;
  const match = String(message).match(/✍️[^\n(]*\(([^)]+)\)/);
  return match ? match[1].trim() : null;
}

function extractOriginalProductId(text) {
  const match = String(text || '').match(/soulart\.ge\/products?\/([a-f0-9]{24})/i);
  return match ? match[1] : null;
}

async function fetchPosts(after = null) {
  const url = new URL(`${GRAPH_API}/${PAGE_ID}/published_posts`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  url.searchParams.set('limit', '100');
  url.searchParams.set('fields', 'id,message,created_time');
  if (after) url.searchParams.set('after', after);
  const resp = await fetch(url.toString());
  return resp.json();
}

async function fetchAllPosts() {
  const all = [];
  let after = null;
  let scanned = 0;
  process.stdout.write('Fetching FB posts');
  while (scanned < MAX_SCAN) {
    const data = await fetchPosts(after);
    if (!data.data || !data.data.length) break;
    for (const p of data.data) { all.push(p); scanned++; }
    process.stdout.write('.');
    if (data.paging?.cursors?.after && data.data.length > 0 && scanned < MAX_SCAN) {
      after = data.paging.cursors.after;
      await sleep(120);
    } else break;
  }
  process.stdout.write('\n');
  return all;
}

async function fetchComments(postId) {
  try {
    const resp = await axios.get(`${GRAPH_API}/${postId}/comments`, {
      params: { access_token: ACCESS_TOKEN, limit: 50 }
    });
    return resp.data.data || [];
  } catch { return []; }
}

async function main() {
  if (!PAGE_ID || !ACCESS_TOKEN) {
    throw new Error('FACEBOOK_POSTS_PAGE_ID and FACEBOOK_POSTS_PAGE_ACCESS_TOKEN must be set in .env');
  }

  const c = await MongoClient.connect(MONGODB_URI);
  const db = c.db('test');

  const seller = await db.collection('users').findOne(
    { artistSlug: TARGET_SLUG },
    { projection: { _id: 1, name: 1, email: 1, artistSlug: 1 } }
  );
  if (!seller) { console.log(`Seller not found: ${TARGET_SLUG}`); await c.close(); return; }
  console.log(`Seller: ${seller.name} (${seller.email}) - ${seller._id}`);

  const allPosts = await fetchAllPosts();
  console.log(`Total page posts scanned: ${allPosts.length}`);

  const matches = allPosts.filter(p => extractAuthorSlug(p.message) === TARGET_SLUG);
  console.log(`Posts matching slug "${TARGET_SLUG}": ${matches.length}`);

  let withId = 0;
  let withoutId = 0;
  let inDb = 0;

  for (let i = 0; i < matches.length; i++) {
    const post = matches[i];
    let productId = extractOriginalProductId(post.message);
    let idSource = 'post';
    if (!productId) {
      const comments = await fetchComments(post.id);
      for (const c of comments) {
        const cid = extractOriginalProductId(c.message);
        if (cid) { productId = cid; idSource = 'comment'; break; }
      }
    }

    const title = (post.message || '').match(/📌\s*(.+)/)?.[1]?.trim() || '(no title)';
    if (productId) {
      withId++;
      const exists = await db.collection('products').findOne(
        { _id: new ObjectId(productId) },
        { projection: { _id: 1 } }
      );
      const inDbStr = exists ? ' [ALREADY IN DB]' : ' [MISSING FROM DB]';
      if (exists) inDb++;
      console.log(`  [${i+1}] ${productId} (from ${idSource}) - ${title}${inDbStr}`);
    } else {
      withoutId++;
      console.log(`  [${i+1}] NO_ID - ${title}`);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total matching posts: ${matches.length}`);
  console.log(`With product ID: ${withId}`);
  console.log(`Without product ID: ${withoutId}`);
  console.log(`Already in DB: ${inDb}`);
  console.log(`Would import: ${withId - inDb}`);

  await c.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
