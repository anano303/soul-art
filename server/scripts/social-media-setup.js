#!/usr/bin/env node

/**
 * სოციალური მედიის კონფიგურაციის დამხმარე სკრიპტი
 * 
 * გამოყენება:
 * node scripts/social-media-setup.js
 * 
 * ეს სკრიპტი დაგეხმარებათ:
 * - Facebook Group ID-ების პოვნაში
 * - Instagram Business Account ID-ის პოვნაში
 * - Access Token-ის ვალიდაციაში
 */

const readline = require('readline');
const https = require('https');

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

async function validateToken(token) {
  console.log('\n🔍 ვამოწმებ Access Token-ს...\n');
  try {
    const url = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`;
    const response = await makeRequest(url);
    
    if (response.data && response.data.is_valid) {
      console.log('✅ Token ვალიდურია!');
      console.log(`   App ID: ${response.data.app_id}`);
      console.log(`   Scopes: ${response.data.scopes?.join(', ')}`);
      console.log(`   Expires: ${response.data.expires_at ? new Date(response.data.expires_at * 1000).toLocaleString('ka-GE') : 'არასდროს'}`);
      return true;
    } else {
      console.log('❌ Token არავალიდურია!');
      return false;
    }
  } catch (error) {
    console.error('❌ შეცდომა Token-ის შემოწმებისას:', error.message);
    return false;
  }
}

async function getPageInfo(pageId, token) {
  console.log('\n🔍 ვიღებ Facebook Page-ის ინფორმაციას...\n');
  try {
    const url = `https://graph.facebook.com/v19.0/${pageId}?fields=id,name,instagram_business_account&access_token=${token}`;
    const response = await makeRequest(url);
    
    if (response.id) {
      console.log('✅ Page ნაპოვნია!');
      console.log(`   ID: ${response.id}`);
      console.log(`   სახელი: ${response.name}`);
      
      if (response.instagram_business_account) {
        console.log(`   Instagram Business Account ID: ${response.instagram_business_account.id}`);
        console.log('\n📋 დააკოპირეთ ეს ID თქვენს .env ფაილში:');
        console.log(`   INSTAGRAM_ACCOUNT_ID=${response.instagram_business_account.id}`);
      } else {
        console.log('   ⚠️  Instagram Account არ არის დაკავშირებული');
      }
      
      return response;
    }
  } catch (error) {
    console.error('❌ შეცდომა Page-ის ინფორმაციის მიღებისას:', error.message);
  }
  return null;
}

async function listUserPages(token) {
  console.log('\n🔍 ვიღებ თქვენი Page-ების სიას...\n');
  try {
    const url = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${token}`;
    const response = await makeRequest(url);
    
    if (response.data && response.data.length > 0) {
      console.log('✅ ნაპოვნია შემდეგი Page-ები:\n');
      response.data.forEach((page, index) => {
        console.log(`${index + 1}. ${page.name}`);
        console.log(`   Page ID: ${page.id}`);
        if (page.instagram_business_account) {
          console.log(`   Instagram ID: ${page.instagram_business_account.id}`);
        }
        console.log('');
      });
      return response.data;
    } else {
      console.log('❌ Page-ები ვერ მოიძებნა');
    }
  } catch (error) {
    console.error('❌ შეცდომა Page-ების სიის მიღებისას:', error.message);
  }
  return [];
}

async function testGroupAccess(groupId, token) {
  console.log(`\n🔍 ვამოწმებ წვდომას ჯგუფზე ${groupId}...\n`);
  try {
    const url = `https://graph.facebook.com/v19.0/${groupId}?fields=id,name&access_token=${token}`;
    const response = await makeRequest(url);
    
    if (response.id) {
      console.log(`✅ წვდომა ჯგუფზე არის!`);
      console.log(`   ID: ${response.id}`);
      console.log(`   სახელი: ${response.name}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ შეცდომა ჯგუფზე წვდომისას:`, error.message);
    console.log('   შესაძლო მიზეზები:');
    console.log('   - არასწორი Group ID');
    console.log('   - თქვენს Page-ს არ აქვს ნებართვა ამ ჯგუფში');
    console.log('   - Token-ს არ აქვს publish_to_groups permission');
  }
  return false;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🚀 Facebook & Instagram კონფიგურაციის დამხმარე');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Access Token
  const token = await question('📝 შეიყვანეთ Facebook Page Access Token: ');
  
  if (!token || token.trim().length < 50) {
    console.log('\n❌ არასწორი Token!');
    rl.close();
    return;
  }

  const isValid = await validateToken(token.trim());
  if (!isValid) {
    console.log('\n⚠️  გააგრძელეთ თუმცა Token შეიძლება არ იყოს სწორი.');
  }

  // 2. List Pages
  console.log('\n═══════════════════════════════════════════════════════');
  const listPages = await question('გსურთ თქვენი Page-ების სიის ნახვა? (y/n): ');
  if (listPages.toLowerCase() === 'y' || listPages.toLowerCase() === 'yes') {
    await listUserPages(token.trim());
  }

  // 3. Page Info with Instagram
  console.log('\n═══════════════════════════════════════════════════════');
  const pageId = await question('📝 შეიყვანეთ Facebook Page ID: ');
  
  if (pageId && pageId.trim()) {
    await getPageInfo(pageId.trim(), token.trim());
  }

  // 4. Test Group Access
  console.log('\n═══════════════════════════════════════════════════════');
  const testGroups = await question('გსურთ Facebook Groups-ზე წვდომის შემოწმება? (y/n): ');
  
  if (testGroups.toLowerCase() === 'y' || testGroups.toLowerCase() === 'yes') {
    const groupIdsInput = await question('📝 შეიყვანეთ Group ID-ები (მძიმით გამოყოფილი): ');
    
    if (groupIdsInput && groupIdsInput.trim()) {
      const groupIds = groupIdsInput.split(',').map(id => id.trim()).filter(Boolean);
      
      for (const groupId of groupIds) {
        await testGroupAccess(groupId, token.trim());
      }
      
      const validGroups = groupIds.join(',');
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📋 დააკოპირეთ ეს თქვენს .env ფაილში:');
      console.log(`\nFACEBOOK_GROUP_IDS=${validGroups}`);
      console.log('FACEBOOK_AUTO_POST_GROUPS=true');
    }
  }

  // 5. Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ კონფიგურაცია დასრულებულია!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📚 შემდეგი ნაბიჯები:');
  console.log('1. გადააკოპირეთ ზემოთ მოცემული ღირებულებები .env ფაილში');
  console.log('2. გადაამოწმეთ permissions Token-ზე:');
  console.log('   - pages_manage_posts');
  console.log('   - pages_read_engagement');
  console.log('   - publish_to_groups (ჯგუფებისთვის)');
  console.log('   - instagram_basic და instagram_content_publish (Instagram-ისთვის)');
  console.log('3. გააქტიურეთ NODE_ENV=production');
  console.log('4. გადატვირთეთ სერვერი');
  console.log('5. იხილეთ სრული გაიდი: SOCIAL_MEDIA_AUTO_POST_GUIDE.md\n');

  rl.close();
}

main().catch(console.error);
