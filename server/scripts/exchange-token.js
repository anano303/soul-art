const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const code =
  '0zvb0vhxb8K0sx9gssmUTW5PcxLxON1D4VjymhON8XWExPOLU_Dhv02K1rnyScVcnv2cDOhji5RNM_8IKpVO3lIhmn-SSoUCdcGh3RzHHA2SzpY8C1fyDJBFMo1ML5jwLW7HsJVaqqGivOcKaEX6G4Oc2oqjxMMPs41lky_bPm0Ccvs19ZNaGXqcPMBH_mHWJWMTf4AonYeLFRMUVZsJR5jbKAsphU0bkWmTRtdbChJd8_xPtC7v1n_ycAg*v!4993.va';

const postData = new URLSearchParams({
  client_key: process.env.TIKTOK_CLIENT_KEY,
  client_secret: process.env.TIKTOK_CLIENT_SECRET,
  code: code,
  grant_type: 'authorization_code',
  redirect_uri: 'https://api.soulart.ge/v1/auth/tiktok/callback',
}).toString();

console.log('🔄 ტოკენის მიღება...\n');

const req = https.request(
  {
    hostname: 'open.tiktokapis.com',
    path: '/v2/oauth/token/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    },
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.access_token) {
          console.log('✅ წარმატება!\n');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`.env-ში ჩაწერე:\n`);
          console.log(`TIKTOK_ACCESS_TOKEN=${parsed.access_token}`);
          console.log(`TIKTOK_REFRESH_TOKEN=${parsed.refresh_token}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(
            `\nAccess Token ვადა: ${Math.round(parsed.expires_in / 3600)} საათი`,
          );
          console.log(
            `Refresh Token ვადა: ${Math.round(parsed.refresh_expires_in / 86400)} დღე`,
          );
        } else {
          console.log('❌ შეცდომა:', JSON.stringify(parsed, null, 2));
        }
      } catch (e) {
        console.log('❌ Parse error:', data);
      }
    });
  },
);

req.write(postData);
req.end();
