/**
 * TikTok OAuth Token Generator
 *
 * გაუშვი: node scripts/tiktok-auth.js
 *
 * 1. გახსნის ბრაუზერში TikTok ავტორიზაციის ლინკს
 * 2. ავტორიზაციის შემდეგ callback-ზე მიიღებს code-ს
 * 3. code-ით აიღებს access_token და refresh_token
 * 4. დაგიბეჭდავს .env-ში ჩასაწერ მნიშვნელობებს
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const url = require('url');
const { exec } = require('child_process');
const path = require('path');

// Load .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// PKCE disabled - TikTok sandbox may not require it

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const PORT = 4444;
// Production redirect URI (registered in TikTok Developer Portal)
const REDIRECT_URI = 'https://api.soulart.ge/v1/auth/tiktok/callback';

if (!CLIENT_KEY || !CLIENT_SECRET) {
  console.error(
    '❌ TIKTOK_CLIENT_KEY და TIKTOK_CLIENT_SECRET უნდა იყოს .env-ში!',
  );
  process.exit(1);
}

console.log('\n🎵 TikTok OAuth Token Generator\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Client Key: ${CLIENT_KEY}`);
console.log(`Redirect URI: ${REDIRECT_URI}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📌 Redirect URI (Portal-ში რეგისტრირებული):');
console.log(`   ${REDIRECT_URI}\n`);
console.log(
  '⚠️  ავტორიზაციის შემდეგ TikTok გადაგამისამართებს production URL-ზე.',
);
console.log('   URL-დან დააკოპირე "code" პარამეტრი და ჩასვი ტერმინალში.\n');

// readline for manual code input
const readline = require('readline');

function getAuthUrl() {
  return `https://www.tiktok.com/v2/auth/authorize/?client_key=${CLIENT_KEY}&scope=video.publish,video.upload&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=soulart_tiktok`;
}

// Main flow: open browser, wait for manual code input
async function main() {
  const authUrl = getAuthUrl();
  console.log('🌐 ბრაუზერში იხსნება TikTok ავტორიზაცია...\n');

  // Open browser
  const openCmd =
    process.platform === 'win32'
      ? 'start'
      : process.platform === 'darwin'
        ? 'open'
        : 'xdg-open';
  exec(`${openCmd} "${authUrl}"`);

  console.log('📋 თუ ბრაუზერი არ გაიხსნა, ხელით გახსენი ეს ლინკი:');
  console.log(`   ${authUrl}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ავტორიზაციის შემდეგ ბრაუზერი გადავა:');
  console.log('  https://api.soulart.ge/v1/auth/tiktok/callback?code=XXXXX...');
  console.log('');
  console.log('🔑 URL-დან დააკოპირე "code=" შემდეგ ნაწილი (& -მდე)');
  console.log('   ან მთლიანი URL ჩასვი:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('📥 ჩასვი code ან მთლიანი callback URL: ', async (input) => {
    rl.close();

    let code = input.trim();

    // If they pasted the full URL, extract the code parameter
    if (code.includes('code=')) {
      const urlObj = new URL(code);
      code = urlObj.searchParams.get('code');
    }

    if (!code) {
      console.error('\n❌ კოდი ცარიელია!');
      process.exit(1);
    }

    console.log(`\n✅ კოდი მივიღეთ: ${code.substring(0, 20)}...`);
    console.log('🔄 ტოკენის მიღება...\n');

    try {
      const tokenData = await exchangeCodeForToken(code);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ ტოკენები მზადაა! .env-ში ჩაწერე:\n');
      console.log(`TIKTOK_ACCESS_TOKEN=${tokenData.access_token}`);
      console.log(`TIKTOK_REFRESH_TOKEN=${tokenData.refresh_token}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(
        `\nAccess Token ვადა: ${Math.round(tokenData.expires_in / 3600)} საათი`,
      );
      console.log(
        `Refresh Token ვადა: ${Math.round(tokenData.refresh_expires_in / 86400)} დღე`,
      );
      console.log(
        '\n💡 სერვერი refresh_token-ით ავტომატურად განაახლებს access_token-ს.',
      );
    } catch (err) {
      console.error('\n❌ ტოკენის მიღება ვერ მოხერხდა:', err.message);
    }

    process.exit(0);
  });
}

function exchangeCodeForToken(code) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      client_key: CLIENT_KEY,
      client_secret: CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    }).toString();

    const options = {
      hostname: 'open.tiktokapis.com',
      path: '/v2/oauth/token/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`${parsed.error}: ${parsed.error_description}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Response parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

main();
