/**
 * Check FB posts for product IDs - looks in both post body and comments
 */
const axios = require('axios');
require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env'),
});

const PAGE_ID =
  process.env.FACEBOOK_POSTS_PAGE_ID || process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN =
  process.env.FACEBOOK_POSTS_PAGE_ACCESS_TOKEN ||
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const API = `https://graph.facebook.com/v19.0`;

async function fetchPosts(url, allPosts = [], maxScan = 100) {
  const res = await axios.get(url);
  const posts = res.data.data || [];
  allPosts.push(...posts);
  console.log(`  Fetched ${allPosts.length} posts so far...`);
  if (allPosts.length >= maxScan || !res.data.paging?.next) return allPosts;
  return fetchPosts(res.data.paging.next, allPosts, maxScan);
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

function extractProductIds(text) {
  if (!text) return [];
  // Match: soulart.ge/products/{id-or-slug} or /product/{id}
  const matches = [
    ...text.matchAll(/soulart\.ge\/products?\/([a-zA-Z0-9_-]+)/g),
  ];
  return matches.map((m) => m[1]);
}

function isArtistPost(msg, artistSlug) {
  if (!msg) return false;
  return msg.includes(`(${artistSlug})`) || msg.includes(`@${artistSlug}`);
}

async function main() {
  console.log('=== Scanning FB posts for product IDs ===\n');

  const url = `${API}/${PAGE_ID}/published_posts?fields=id,message,created_time&limit=100&access_token=${ACCESS_TOKEN}`;
  const posts = await fetchPosts(url, [], 700);
  console.log(`\nTotal posts: ${posts.length}\n`);

  // Check gskkart and natia posts
  const artists = ['gskkart', 'natiajanturidze'];

  for (const artist of artists) {
    console.log(`\n=== ${artist} ===`);
    const artistPosts = posts.filter((p) => isArtistPost(p.message, artist));
    console.log(`Found ${artistPosts.length} posts`);

    let withIdInBody = 0;
    let withIdInComment = 0;
    let noId = 0;
    const examples = [];

    for (let i = 0; i < artistPosts.length; i++) {
      const post = artistPosts[i];

      // Check body for product IDs
      const bodyIds = extractProductIds(post.message);

      // Check comments
      const comments = await fetchComments(post.id);
      const commentIds = [];
      for (const c of comments) {
        commentIds.push(...extractProductIds(c.message));
      }

      const allIds = [...new Set([...bodyIds, ...commentIds])];

      if (bodyIds.length > 0) withIdInBody++;
      if (commentIds.length > 0) withIdInComment++;
      if (allIds.length === 0) noId++;

      // Show first few examples
      if (examples.length < 5) {
        const title = (post.message || '').split('\n')[0].substring(0, 60);
        examples.push({
          title,
          date: post.created_time,
          bodyIds,
          commentIds,
          commentCount: comments.length,
          allComments: comments.map((c) => c.message?.substring(0, 100)),
        });
      }

      if ((i + 1) % 10 === 0)
        console.log(`  Checked ${i + 1}/${artistPosts.length}...`);
    }

    console.log(`\nResults for ${artist}:`);
    console.log(`  ID in body: ${withIdInBody}`);
    console.log(`  ID in comment: ${withIdInComment}`);
    console.log(`  No ID found: ${noId}`);
    console.log(`\nFirst 5 examples:`);
    for (const ex of examples) {
      console.log(`  ${ex.date} | ${ex.title}`);
      console.log(
        `    Body IDs: ${ex.bodyIds.length ? ex.bodyIds.join(', ') : 'none'}`,
      );
      console.log(
        `    Comment IDs: ${ex.commentIds.length ? ex.commentIds.join(', ') : 'none'}`,
      );
      console.log(
        `    Comments (${ex.commentCount}): ${ex.allComments.join(' | ') || 'none'}`,
      );
    }
  }
}

main().catch(console.error);
