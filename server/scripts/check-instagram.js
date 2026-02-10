// Check Instagram API configuration and permissions
require('dotenv').config();
const axios = require('axios');

async function checkInstagram() {
  // Check BOTH tokens
  const token1 = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const token2 = process.env.FACEBOOK_POSTS_PAGE_ACCESS_TOKEN;
  const instagramAccountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const pageId =
    process.env.FACEBOOK_POSTS_PAGE_ID || process.env.FACEBOOK_PAGE_ID;

  console.log('\n=== Token Status ===');
  console.log(
    'FACEBOOK_PAGE_ACCESS_TOKEN:',
    token1 ? `✅ Set (${token1.substring(0, 20)}...)` : '❌ NOT SET',
  );
  console.log(
    'FACEBOOK_POSTS_PAGE_ACCESS_TOKEN:',
    token2 ? `✅ Set (${token2.substring(0, 20)}...)` : '❌ NOT SET',
  );

  // Check if code has the bug (using same token twice)
  console.log('\n⚠️ CODE BUG: facebook-posting.service.ts line 30-31');
  console.log(
    '   Currently: FACEBOOK_PAGE_ACCESS_TOKEN || FACEBOOK_PAGE_ACCESS_TOKEN (DUPLICATE!)',
  );
  console.log(
    '   Should be: FACEBOOK_POSTS_PAGE_ACCESS_TOKEN || FACEBOOK_PAGE_ACCESS_TOKEN',
  );

  const pageAccessToken = token2 || token1; // Use POSTS token first

  console.log('\n=== Instagram Configuration ===');
  console.log('INSTAGRAM_ACCOUNT_ID:', instagramAccountId || '❌ NOT SET');
  console.log('INSTAGRAM_AUTO_POST:', process.env.INSTAGRAM_AUTO_POST);
  console.log('Page ID:', pageId);
  console.log('Token exists:', !!pageAccessToken);

  if (!pageAccessToken) {
    console.log('\n❌ No access token found!');
    return;
  }

  try {
    // 1. Check token permissions
    console.log('\n=== Checking Token Permissions ===');
    const debugRes = await axios.get('https://graph.facebook.com/debug_token', {
      params: {
        input_token: pageAccessToken,
        access_token: pageAccessToken,
      },
    });

    const scopes = debugRes.data?.data?.scopes || [];
    console.log('Token scopes:', scopes.join(', '));

    const hasInstagramBasic = scopes.includes('instagram_basic');
    const hasInstagramContent = scopes.includes('instagram_content_publish');
    const hasBusinessManagement = scopes.includes('business_management');

    console.log('\n=== Required Permissions ===');
    console.log('instagram_basic:', hasInstagramBasic ? '✅' : '❌ MISSING');
    console.log(
      'instagram_content_publish:',
      hasInstagramContent ? '✅' : '❌ MISSING',
    );
    console.log(
      'business_management:',
      hasBusinessManagement ? '✅' : '❌ MISSING',
    );

    // 2. Check if Instagram account is connected to Page
    console.log('\n=== Checking Page-Instagram Connection ===');
    const pageRes = await axios.get(
      `https://graph.facebook.com/v19.0/${pageId}`,
      {
        params: {
          fields: 'instagram_business_account',
          access_token: pageAccessToken,
        },
      },
    );

    const connectedIgAccount = pageRes.data?.instagram_business_account?.id;
    console.log(
      'Connected Instagram Account ID:',
      connectedIgAccount || '❌ NOT CONNECTED',
    );

    if (connectedIgAccount && instagramAccountId) {
      if (connectedIgAccount === instagramAccountId) {
        console.log('✅ Instagram Account ID matches!');
      } else {
        console.log('⚠️ WARNING: Instagram Account IDs do not match!');
        console.log('   .env has:', instagramAccountId);
        console.log('   Connected:', connectedIgAccount);
        console.log(
          '   Use this in .env: INSTAGRAM_ACCOUNT_ID=' + connectedIgAccount,
        );
      }
    }

    // 3. Check Instagram account details
    if (instagramAccountId) {
      console.log('\n=== Instagram Account Details ===');
      try {
        const igRes = await axios.get(
          `https://graph.facebook.com/v19.0/${instagramAccountId}`,
          {
            params: {
              fields: 'id,username,name,profile_picture_url',
              access_token: pageAccessToken,
            },
          },
        );
        console.log('Username:', igRes.data?.username || 'N/A');
        console.log('Name:', igRes.data?.name || 'N/A');
        console.log('✅ Instagram account accessible!');
      } catch (err) {
        console.log(
          '❌ Cannot access Instagram account:',
          err.response?.data?.error?.message || err.message,
        );
      }
    }
  } catch (error) {
    console.error(
      '\n❌ Error:',
      error.response?.data?.error?.message || error.message,
    );

    if (error.response?.data?.error?.code === 190) {
      console.log('\n⚠️ Token is invalid or expired!');
      console.log('Generate a new token from Facebook Developer Console');
    }
  }
}

checkInstagram();
