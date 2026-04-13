/**
 * Restore original product IDs from Facebook posts
 *
 * Strategy:
 * 1. Fetch all FB posts with comments → extract original product IDs
 * 2. Parse post title/price from FB post body
 * 3. Match to our imported products by name+price
 * 4. For each match: create new doc with old _id, copy all fields, delete new doc
 */
const { MongoClient, ObjectId } = require('mongodb');
const axios = require('axios');
require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env'),
});

const MONGODB_URI = process.env.MONGODB_URI;
const PAGE_ID =
  process.env.FACEBOOK_POSTS_PAGE_ID || process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN =
  process.env.FACEBOOK_POSTS_PAGE_ACCESS_TOKEN ||
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const API = `https://graph.facebook.com/v19.0`;

const GIGA_ART_ID = '69d5f81b3b0ca78dc71c1e19';
const NATIA_ID = '6912f0db231e458e759a80c3';

async function fetchAllPosts(url, allPosts = [], maxScan = 700) {
  const res = await axios.get(url);
  const posts = res.data.data || [];
  allPosts.push(...posts);
  if (allPosts.length % 200 === 0)
    console.log(`  Fetched ${allPosts.length} posts...`);
  if (allPosts.length >= maxScan || !res.data.paging?.next) return allPosts;
  return fetchAllPosts(res.data.paging.next, allPosts, maxScan);
}

async function fetchComments(postId) {
  try {
    const res = await axios.get(`${API}/${postId}/comments`, {
      params: { access_token: ACCESS_TOKEN, limit: 100 },
    });
    return res.data.data || [];
  } catch (e) {
    return [];
  }
}

function extractProductId(text) {
  if (!text) return null;
  const m = text.match(/soulart\.ge\/products?\/([a-f0-9]{24})/i);
  return m ? m[1] : null;
}

function parseTitle(msg) {
  if (!msg) return null;
  const m = msg.match(/📌\s*(.+)/);
  return m ? m[1].trim() : null;
}

function parsePrice(msg) {
  if (!msg) return null;
  const m = msg.match(/💰\s*ფასი:\s*([\d,.]+)/);
  return m ? parseFloat(m[1].replace(',', '')) : null;
}

function isArtistPost(msg, slug) {
  if (!msg) return false;
  return msg.includes(`(${slug})`) || msg.includes(`@${slug}`);
}

async function main() {
  // 1. Fetch FB posts
  console.log('📡 Fetching FB posts...');
  const url = `${API}/${PAGE_ID}/published_posts?fields=id,message,created_time&limit=100&access_token=${ACCESS_TOKEN}`;
  const allPosts = await fetchAllPosts(url);
  console.log(`Total: ${allPosts.length} posts\n`);

  // 2. For each artist, extract original IDs
  const artistConfigs = [
    { slug: 'gskkart', userId: GIGA_ART_ID },
    { slug: 'natiajanturidze', userId: NATIA_ID },
  ];

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const productsCol = db.collection('products');

  for (const { slug, userId } of artistConfigs) {
    console.log(`\n=== Processing ${slug} ===`);
    const userObjId = new ObjectId(userId);

    // Filter posts for this artist
    const artistPosts = allPosts.filter((p) => isArtistPost(p.message, slug));
    console.log(`Found ${artistPosts.length} FB posts for ${slug}`);

    // Extract original product IDs from posts and comments
    const fbEntries = []; // { originalId, title, price, fbDate }

    for (let i = 0; i < artistPosts.length; i++) {
      const post = artistPosts[i];
      const msg = post.message || '';
      const title = parseTitle(msg);
      const price = parsePrice(msg);

      // Check body first
      let originalId = extractProductId(msg);

      // Then check comments
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
        fbEntries.push({ originalId, title, price, fbDate: post.created_time });
      }

      if ((i + 1) % 10 === 0)
        console.log(`  Scanned ${i + 1}/${artistPosts.length} posts...`);
    }

    console.log(`\nExtracted ${fbEntries.length} original product IDs from FB`);

    // Get current imported products
    const currentProducts = await productsCol
      .find({ user: userObjId })
      .toArray();
    console.log(`Current products in DB: ${currentProducts.length}`);

    // Match and restore IDs
    let matched = 0;
    let alreadyCorrect = 0;
    let noMatch = 0;
    let conflicts = 0;

    for (const fb of fbEntries) {
      // Check if original ID already exists
      const existingById = await productsCol.findOne({
        _id: new ObjectId(fb.originalId),
      });
      if (existingById) {
        // Already has this ID (maybe from a previous run or still in DB)
        if (existingById.user.toString() === userId) {
          alreadyCorrect++;
        } else {
          conflicts++;
          console.log(
            `  ⚠️ Conflict: ${fb.originalId} belongs to different user (${existingById.user})`,
          );
        }
        continue;
      }

      // Find matching product by title + price
      const candidates = currentProducts.filter((p) => {
        const nameMatch = p.name === fb.title;
        const priceMatch = fb.price ? Math.abs(p.price - fb.price) < 1 : true;
        return nameMatch && priceMatch;
      });

      if (candidates.length === 0) {
        noMatch++;
        console.log(
          `  ❌ No match for: "${fb.title}" (${fb.price}₾) → ${fb.originalId}`,
        );
        continue;
      }

      // Take first unmatched candidate
      const product = candidates[0];
      const oldId = product._id;
      const newId = new ObjectId(fb.originalId);

      // Clone document with original ID
      const clone = { ...product, _id: newId };
      try {
        await productsCol.insertOne(clone);
        await productsCol.deleteOne({ _id: oldId });
        matched++;

        // Remove from currentProducts so we don't match it again
        const idx = currentProducts.findIndex((p) => p._id.equals(oldId));
        if (idx !== -1) currentProducts.splice(idx, 1);

        console.log(`  ✅ ${fb.title} → ${fb.originalId} (was: ${oldId})`);
      } catch (e) {
        console.log(`  ❌ Error restoring ${fb.originalId}: ${e.message}`);
      }
    }

    console.log(`\n📊 ${slug} Summary:`);
    console.log(`  Matched & restored: ${matched}`);
    console.log(`  Already correct: ${alreadyCorrect}`);
    console.log(`  No match found: ${noMatch}`);
    console.log(`  Conflicts: ${conflicts}`);
    console.log(`  Remaining with new IDs: ${currentProducts.length}`);
  }

  await client.close();
  console.log('\n🎉 Done!');
}

main().catch(console.error);
