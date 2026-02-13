#!/usr/bin/env node

/**
 * Facebook Page Posts Bulk Delete Script
 * 
 * This script deletes all posts from a Facebook page using the Graph API.
 * 
 * SETUP:
 * 1. Go to https://developers.facebook.com/tools/explorer/
 * 2. Select your App (or create one at developers.facebook.com)
 * 3. Click "Get Page Access Token" and select your page
 * 4. Make sure you have these permissions:
 *    - pages_manage_posts
 *    - pages_read_engagement
 *    - pages_show_list
 * 5. Copy the generated Access Token
 * 6. Get your Page ID (visible in the Graph API Explorer or your page's About section)
 * 
 * USAGE:
 *   node delete-facebook-posts.js
 * 
 * Or with environment variables:
 *   FB_PAGE_ID=your_page_id FB_ACCESS_TOKEN=your_token node delete-facebook-posts.js
 */

const readline = require('readline');

// Configuration - Set these or use environment variables
const PAGE_ID = process.env.FB_PAGE_ID || '';
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN || '';

// Rate limiting settings
const DELAY_BETWEEN_DELETES = 1000; // 1 second between deletes to avoid rate limits
const BATCH_SIZE = 25; // Posts to fetch per request

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPosts(pageId, accessToken, after = null) {
  const url = new URL(`https://graph.facebook.com/v18.0/${pageId}/posts`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('limit', BATCH_SIZE.toString());
  url.searchParams.set('fields', 'id,message,created_time');
  
  if (after) {
    url.searchParams.set('after', after);
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new Error(`Facebook API Error: ${data.error.message}`);
  }

  return data;
}

async function deletePost(postId, accessToken) {
  const url = `https://graph.facebook.com/v18.0/${postId}?access_token=${accessToken}`;
  
  const response = await fetch(url, {
    method: 'DELETE'
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Failed to delete post ${postId}: ${data.error.message}`);
  }

  return data.success;
}

async function getAllPosts(pageId, accessToken) {
  console.log('\n📥 Fetching all posts...\n');
  
  const allPosts = [];
  let after = null;
  let page = 1;

  while (true) {
    const data = await fetchPosts(pageId, accessToken, after);
    
    if (!data.data || data.data.length === 0) {
      break;
    }

    allPosts.push(...data.data);
    console.log(`   Page ${page}: Found ${data.data.length} posts (Total: ${allPosts.length})`);

    if (data.paging && data.paging.cursors && data.paging.cursors.after) {
      after = data.paging.cursors.after;
      page++;
    } else {
      break;
    }

    await sleep(500); // Small delay between fetches
  }

  return allPosts;
}

async function main() {
  console.log('\n🔵 Facebook Page Posts Bulk Delete Tool\n');
  console.log('=' .repeat(50));

  let pageId = PAGE_ID;
  let accessToken = ACCESS_TOKEN;

  // Prompt for credentials if not set
  if (!pageId) {
    pageId = await question('\n📄 Enter your Facebook Page ID: ');
  }

  if (!accessToken) {
    console.log('\n🔑 To get an Access Token:');
    console.log('   1. Go to https://developers.facebook.com/tools/explorer/');
    console.log('   2. Select your App');
    console.log('   3. Click "Get Page Access Token" and select your page');
    console.log('   4. Required permissions: pages_manage_posts, pages_read_engagement\n');
    accessToken = await question('🔑 Enter your Page Access Token: ');
  }

  if (!pageId || !accessToken) {
    console.error('\n❌ Error: Page ID and Access Token are required.\n');
    rl.close();
    process.exit(1);
  }

  try {
    // Fetch all posts
    const posts = await getAllPosts(pageId, accessToken);

    if (posts.length === 0) {
      console.log('\n✅ No posts found on this page!\n');
      rl.close();
      return;
    }

    // Show summary
    console.log('\n' + '=' .repeat(50));
    console.log(`📊 Found ${posts.length} posts to delete\n`);
    
    // Show first few posts as preview
    console.log('Preview of posts to be deleted:');
    posts.slice(0, 5).forEach((post, i) => {
      const message = post.message 
        ? post.message.substring(0, 50) + (post.message.length > 50 ? '...' : '')
        : '(no text)';
      console.log(`   ${i + 1}. [${post.created_time}] ${message}`);
    });
    
    if (posts.length > 5) {
      console.log(`   ... and ${posts.length - 5} more posts`);
    }

    // Confirm deletion
    console.log('\n⚠️  WARNING: This action cannot be undone!\n');
    const confirm = await question(`Type "DELETE ALL" to confirm deletion of ${posts.length} posts: `);

    if (confirm !== 'DELETE ALL') {
      console.log('\n❌ Deletion cancelled.\n');
      rl.close();
      return;
    }

    // Delete posts
    console.log('\n🗑️  Starting deletion...\n');
    
    let deleted = 0;
    let failed = 0;

    for (const post of posts) {
      try {
        await deletePost(post.id, accessToken);
        deleted++;
        const message = post.message 
          ? post.message.substring(0, 30) + (post.message.length > 30 ? '...' : '')
          : '(no text)';
        console.log(`   ✅ [${deleted}/${posts.length}] Deleted: ${message}`);
      } catch (error) {
        failed++;
        console.log(`   ❌ [${deleted + failed}/${posts.length}] Failed: ${error.message}`);
      }

      // Rate limiting delay
      await sleep(DELAY_BETWEEN_DELETES);
    }

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Deletion Complete!\n');
    console.log(`   ✅ Successfully deleted: ${deleted}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📝 Total processed: ${posts.length}\n`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    
    if (error.message.includes('Invalid OAuth')) {
      console.log('💡 Tip: Your access token may have expired. Generate a new one at:');
      console.log('   https://developers.facebook.com/tools/explorer/\n');
    }
  }

  rl.close();
}

main();
