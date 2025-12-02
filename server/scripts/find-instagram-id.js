#!/usr/bin/env node

/**
 * Instagram Business Account ID-ის პოვნის სკრიპტი
 * 
 * გამოყენება:
 * node scripts/find-instagram-id.js
 */

const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function getInstagramIdFromPage(pageId, accessToken) {
  console.log('\n🔍 ვეძებ Instagram Account-ს Facebook Page-დან...\n');
  
  try {
    const url = `https://graph.facebook.com/v19.0/${pageId}?fields=id,name,instagram_business_account{id,username,name,profile_picture_url}&access_token=${accessToken}`;
    const response = await makeRequest(url);
    
    if (response.instagram_business_account) {
      const ig = response.instagram_business_account;
      console.log('✅ Instagram Business Account ნაპოვნია!\n');
      console.log(`📱 Instagram Username: @${ig.username}`);
      console.log(`📋 Instagram Account ID: ${ig.id}`);
      console.log(`👤 Name: ${ig.name || 'N/A'}\n`);
      
      console.log('═══════════════════════════════════════════════════════');
      console.log('📝 დააკოპირეთ ეს თქვენს .env ფაილში:\n');
      console.log(`INSTAGRAM_ACCOUNT_ID=${ig.id}`);
      console.log('INSTAGRAM_AUTO_POST=true');
      console.log('═══════════════════════════════════════════════════════\n');
      
      return ig.id;
    } else {
      console.log('❌ Instagram Business Account არ არის დაკავშირებული ამ Page-თან\n');
      console.log('📚 Instagram-ის დაკავშირებისთვის:');
      console.log('1. გადადით Facebook Page Settings → Instagram');
      console.log('2. Connect Account და შედით Instagram-ში');
      console.log('3. Instagram Account უნდა იყოს Business Account (არა Personal)');
      console.log('4. თუ Personal-ია, გადაიყვანეთ Business-ად Instagram Settings-დან\n');
      
      return null;
    }
  } catch (error) {
    console.error('❌ შეცდომა:', error.message);
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n⚠️  ინტერნეტ კავშირის პრობლემა');
    }
    return null;
  }
}

async function listAllPagesWithInstagram(accessToken) {
  console.log('\n🔍 ვიღებ ყველა Page-ის Instagram ინფორმაციას...\n');
  
  try {
    const url = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${accessToken}`;
    const response = await makeRequest(url);
    
    if (response.data && response.data.length > 0) {
      console.log('✅ ნაპოვნი Facebook Pages:\n');
      
      let foundInstagram = false;
      
      response.data.forEach((page, index) => {
        console.log(`${index + 1}. 📄 ${page.name}`);
        console.log(`   Page ID: ${page.id}`);
        
        if (page.instagram_business_account) {
          foundInstagram = true;
          console.log(`   ✅ Instagram: @${page.instagram_business_account.username}`);
          console.log(`   📋 Instagram ID: ${page.instagram_business_account.id}`);
        } else {
          console.log(`   ❌ Instagram არ არის დაკავშირებული`);
        }
        console.log('');
      });
      
      if (foundInstagram) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('💡 აირჩიეთ სასურველი Instagram ID და დაამატეთ .env ფაილში');
        console.log('═══════════════════════════════════════════════════════\n');
      } else {
        console.log('⚠️  არცერთ Page-ს არ აქვს Instagram დაკავშირებული\n');
      }
      
      return response.data;
    } else {
      console.log('❌ Page-ები ვერ მოიძებნა\n');
      return [];
    }
  } catch (error) {
    console.error('❌ შეცდომა:', error.message);
    return [];
  }
}

async function getInstagramInfo(instagramId, accessToken) {
  console.log(`\n🔍 ვიღებ Instagram Account-ის დეტალებს...\n`);
  
  try {
    const url = `https://graph.facebook.com/v19.0/${instagramId}?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url&access_token=${accessToken}`;
    const response = await makeRequest(url);
    
    if (response.id) {
      console.log('✅ Instagram Account Info:\n');
      console.log(`📱 Username: @${response.username}`);
      console.log(`👤 Name: ${response.name || 'N/A'}`);
      console.log(`📝 Bio: ${response.biography || 'N/A'}`);
      console.log(`👥 Followers: ${response.followers_count || 'N/A'}`);
      console.log(`👁️  Following: ${response.follows_count || 'N/A'}`);
      console.log(`📸 Posts: ${response.media_count || 'N/A'}`);
      console.log(`📋 ID: ${response.id}\n`);
      
      return response;
    }
  } catch (error) {
    console.error('❌ შეცდომა:', error.message);
  }
  return null;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  📱 Instagram Business Account ID-ის პოვნა');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('💡 Instagram-ის API-სთვის საჭიროა:');
  console.log('   • Instagram Business Account (არა Personal)');
  console.log('   • Instagram დაკავშირებული Facebook Page-თან');
  console.log('   • Page Access Token permissions-ებით:\n');
  console.log('     - instagram_basic');
  console.log('     - instagram_content_publish');
  console.log('     - pages_read_engagement\n');
  
  const accessToken = await question('📝 შეიყვანეთ Facebook Page Access Token: ');
  
  if (!accessToken || accessToken.trim().length < 50) {
    console.log('\n❌ არასწორი Access Token!');
    rl.close();
    return;
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('აირჩიეთ ოფცია:\n');
  console.log('1. ვნახო ყველა Page და მათი Instagram Accounts');
  console.log('2. მაქვს Page ID და მინდა Instagram ID-ის პოვნა');
  console.log('3. მაქვს Instagram ID და მინდა დეტალების ნახვა\n');
  
  const choice = await question('📝 აირჩიეთ (1/2/3): ');
  
  console.log('\n═══════════════════════════════════════════════════════');
  
  switch(choice.trim()) {
    case '1':
      await listAllPagesWithInstagram(accessToken.trim());
      break;
      
    case '2':
      const pageId = await question('📝 შეიყვანეთ Facebook Page ID: ');
      if (pageId && pageId.trim()) {
        await getInstagramIdFromPage(pageId.trim(), accessToken.trim());
      }
      break;
      
    case '3':
      const igId = await question('📝 შეიყვანეთ Instagram Business Account ID: ');
      if (igId && igId.trim()) {
        await getInstagramInfo(igId.trim(), accessToken.trim());
      }
      break;
      
    default:
      console.log('❌ არასწორი არჩევანი');
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📚 დამატებითი რესურსები:\n');
  console.log('• Instagram Business Account-ად გადაყვანა:');
  console.log('  Instagram App → Settings → Account → Switch to Professional Account\n');
  console.log('• Instagram-ის Facebook Page-თან დაკავშირება:');
  console.log('  Facebook Page Settings → Instagram → Connect Account\n');
  console.log('• Access Token Permissions:');
  console.log('  https://developers.facebook.com/tools/explorer/\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  rl.close();
}

main().catch(console.error);
