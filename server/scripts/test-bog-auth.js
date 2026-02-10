// Test BOG API Authentication
// Usage: node scripts/test-bog-auth.js

require('dotenv').config();
const axios = require('axios');

async function testBogAuth() {
  console.log('=== BOG API Authentication Test ===\n');

  // Check environment variables
  const withdrawalClientId = process.env.BOG_WITHDRAWAL_CLIENT_ID;
  const withdrawalClientSecret = process.env.BOG_WITHDRAWAL_CLIENT_SECRET;
  const bonlineClientId = process.env.BOG_BONLINE_CLIENT_ID;
  const bonlineClientSecret = process.env.BOG_BONLINE_CLIENT_SECRET;
  const companyIban = process.env.BOG_COMPANY_IBAN;
  const apiUrl = process.env.BOG_API_URL;

  console.log('Environment Variables:');
  console.log(
    'BOG_WITHDRAWAL_CLIENT_ID:',
    withdrawalClientId ? '✅ Set' : '❌ Missing',
  );
  console.log(
    'BOG_WITHDRAWAL_CLIENT_SECRET:',
    withdrawalClientSecret ? '✅ Set' : '❌ Missing',
  );
  console.log(
    'BOG_BONLINE_CLIENT_ID:',
    bonlineClientId ? '✅ Set' : '❌ Missing',
  );
  console.log(
    'BOG_BONLINE_CLIENT_SECRET:',
    bonlineClientSecret ? '✅ Set' : '❌ Missing',
  );
  console.log('BOG_COMPANY_IBAN:', companyIban ? '✅ Set' : '❌ Missing');
  console.log('BOG_API_URL:', apiUrl ? '✅ Set' : '❌ Missing');

  if (!withdrawalClientId || !withdrawalClientSecret) {
    console.log('\n❌ BOG_WITHDRAWAL credentials are missing!');
    console.log('Cannot test withdrawal authentication.\n');
    return;
  }

  // Test authentication
  console.log('\n=== Testing BOG Withdrawal Authentication ===');
  const authEndpoint =
    'https://account.bog.ge/auth/realms/bog/protocol/openid-connect/token';

  try {
    console.log('Requesting token from:', authEndpoint);
    console.log('Using Client ID:', withdrawalClientId.substring(0, 8) + '...');

    const basicAuth = Buffer.from(
      `${withdrawalClientId}:${withdrawalClientSecret}`,
    ).toString('base64');

    const response = await axios.post(
      authEndpoint,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: withdrawalClientId,
        client_secret: withdrawalClientSecret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basicAuth}`,
        },
      },
    );

    console.log('\n✅ Authentication Successful!');
    console.log(
      'Access Token:',
      response.data.access_token?.substring(0, 50) + '...',
    );
    console.log('Token Type:', response.data.token_type);
    console.log('Expires In:', response.data.expires_in, 'seconds');
  } catch (error) {
    console.log('\n❌ Authentication Failed!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }

    console.log('\n=== Possible Solutions ===');
    console.log(
      '1. Check if BOG_WITHDRAWAL_CLIENT_ID and BOG_WITHDRAWAL_CLIENT_SECRET are correct',
    );
    console.log(
      '2. The credentials may have expired - contact BOG bank to renew',
    );
    console.log('3. Check if the API access is still active for this client');
    console.log('4. Verify network connectivity to account.bog.ge');
  }
}

testBogAuth();
