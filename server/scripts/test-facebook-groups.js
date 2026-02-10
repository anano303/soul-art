// Test Facebook Group posting
const axios = require('axios');
require('dotenv').config();

async function testGroupPost() {
  console.log('🔍 Testing Facebook Group Posting');
  console.log('='.repeat(60));

  const pageAccessToken =
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
    process.env.FACEBOOK_POSTS_PAGE_ACCESS_TOKEN;
  const groupIds = process.env.FACEBOOK_GROUP_IDS
    ? process.env.FACEBOOK_GROUP_IDS.split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

  const autoPostGroups =
    (process.env.FACEBOOK_AUTO_POST_GROUPS || 'false').toLowerCase() === 'true';

  console.log('\n📋 Configuration:');
  console.log('   FACEBOOK_AUTO_POST_GROUPS:', autoPostGroups);
  console.log(
    '   Group IDs:',
    groupIds.length > 0 ? groupIds.join(', ') : 'NONE',
  );
  console.log(
    '   Page Access Token:',
    pageAccessToken ? `${pageAccessToken.substring(0, 20)}...` : 'NOT SET',
  );

  if (!autoPostGroups) {
    console.log(
      '\n❌ FACEBOOK_AUTO_POST_GROUPS is false - group posting is disabled!',
    );
    return;
  }

  if (groupIds.length === 0) {
    console.log('\n❌ No FACEBOOK_GROUP_IDS configured!');
    return;
  }

  if (!pageAccessToken) {
    console.log('\n❌ No page access token configured!');
    return;
  }

  // Test each group
  for (const groupId of groupIds) {
    console.log(`\n📱 Testing Group ${groupId}...`);

    try {
      // First, check if we have access to the group
      const groupInfoUrl = `https://graph.facebook.com/v19.0/${groupId}?access_token=${pageAccessToken}`;

      console.log('   Checking group info...');
      try {
        const groupRes = await axios.get(groupInfoUrl);
        console.log(
          '   ✅ Group accessible:',
          groupRes.data.name || groupRes.data.id,
        );
      } catch (error) {
        console.log(
          '   ⚠️ Cannot get group info:',
          error.response?.data?.error?.message || error.message,
        );
      }

      // Try to get feed (to check write permissions)
      const feedUrl = `https://graph.facebook.com/v19.0/${groupId}/feed?access_token=${pageAccessToken}&limit=1`;

      console.log('   Checking feed access...');
      try {
        const feedRes = await axios.get(feedUrl);
        console.log(
          '   ✅ Feed accessible, posts:',
          feedRes.data?.data?.length || 0,
        );
      } catch (error) {
        const errMsg = error.response?.data?.error?.message || error.message;
        console.log('   ❌ Feed access failed:', errMsg);

        if (errMsg.includes('200') || errMsg.includes('permission')) {
          console.log('\n   💡 SOLUTION: You need to:');
          console.log(
            '   1. Make sure the Page/App has permission to post in the group',
          );
          console.log('   2. Add the app as a group admin or moderator');
          console.log(
            '   3. Use a User access token instead of Page access token',
          );
        }
      }
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data || error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('💡 IMPORTANT: To post to Facebook Groups, you need:');
  console.log('   1. A User access token with publish_to_groups permission');
  console.log('   2. The user must be an admin/moderator of the group');
  console.log('   3. OR the app must be added to the group');
  console.log('   Page access tokens usually CANNOT post to groups!');
}

testGroupPost();
