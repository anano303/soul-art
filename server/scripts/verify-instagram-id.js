#!/usr/bin/env node

/**
 * Instagram Account ID-ის შემოწმება
 * ამოწმებს არის თუ არა .env ფაილში ჩაწერილი ID სწორი
 */

const https = require('https');

const TOKEN = 'EAAh5uzqZCKRIBPZBtHE0JpHFFbsS47EAAh5uzqZCKRIBP22uG9wc5sKNWz53S9gfuRzehCmVDcZAX6grP5X9XHU0eNY7wNoos9vXKc9Toq4qN2tXioAiGwalBZC93NQOj4u4nCE4doJQ2Rwp9HPH5Md4jUD0qIZAHoNoVjBHNZBa7xZCeByKykCXzxhe8ZAZCwSUupRku3qqiWv7vdUe068UX8ZBoutrK7n6ZAaBi4vPV9ZArFbLEULamIfn0p2NjRSP1vVxvvwqcqZAQJsZAeTFNgw5uxwZAMgOSA7x1uKNNfF4PLjEAjPK0PAFVxZBW7vUaANhLJwPgF8OOujdSEWSvjj4H2603ZCpAq7CubgQN9ZBRnPIjku2U5MonX8XzbsTvD1zgXykYAZDZD';
const PAGE_ID = '542501458957000';
const INSTAGRAM_ID = '17841405309211844';

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

async function checkInstagramId() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🔍 Instagram Account ID-ის შემოწმება');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📋 .env ფაილში ჩაწერილი ინფორმაცია:');
  console.log(`   Page ID: ${PAGE_ID}`);
  console.log(`   Instagram ID: ${INSTAGRAM_ID}\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 ვამოწმებ Facebook Page-ის Instagram-ს...\n');

  try {
    // შევამოწმოთ რა Instagram Account არის დაკავშირებული Page-თან
    const pageUrl = `https://graph.facebook.com/v19.0/${PAGE_ID}?fields=instagram_business_account{id,username,name}&access_token=${TOKEN}`;
    const pageData = await makeRequest(pageUrl);

    if (pageData.error) {
      console.log('❌ შეცდომა:', pageData.error.message);
      console.log('\n⚠️  შესაძლო მიზეზები:');
      console.log('   • Access Token-ს ამოეწურა ვადა');
      console.log('   • Token-ს არ აქვს საჭირო permissions');
      console.log('   • Instagram არ არის დაკავშირებული Page-თან\n');
      return;
    }

    if (!pageData.instagram_business_account) {
      console.log('❌ Instagram Account არ არის დაკავშირებული ამ Page-თან!\n');
      console.log('📝 რას უნდა გააკეთოთ:');
      console.log('   1. Instagram App → Settings → Linked Accounts → Facebook');
      console.log('   2. ან Facebook Page Settings → Instagram → Connect Account\n');
      console.log('⚠️  .env ფაილში ჩაწერილი ID (17841405309211844) არ არის თქვენი!\n');
      return;
    }

    const realInstagramId = pageData.instagram_business_account.id;
    const username = pageData.instagram_business_account.username;
    const name = pageData.instagram_business_account.name;

    console.log('✅ Instagram Account ნაპოვნია!\n');
    console.log(`📱 Username: @${username}`);
    console.log(`👤 Name: ${name}`);
    console.log(`📋 Real Instagram ID: ${realInstagramId}\n`);

    console.log('═══════════════════════════════════════════════════════');
    
    if (realInstagramId === INSTAGRAM_ID) {
      console.log('✅ შედეგი: .env ფაილში ID სწორია! 🎉\n');
      console.log(`   ${INSTAGRAM_ID} === ${realInstagramId}\n`);
      console.log('✅ თქვენი სისტემა მზადაა Instagram-ზე ავტომატური პოსტირებისთვის!');
    } else {
      console.log('❌ შედეგი: .env ფაილში ID არასწორია!\n');
      console.log(`   .env ფაილში: ${INSTAGRAM_ID}`);
      console.log(`   რეალური ID:  ${realInstagramId}\n`);
      console.log('🔧 რას უნდა გააკეთოთ:\n');
      console.log('   განაახლეთ .env ფაილში:');
      console.log(`   INSTAGRAM_ACCOUNT_ID=${realInstagramId}\n`);
    }

  } catch (error) {
    console.log('❌ შეცდომა:', error.message);
    console.log('\n⚠️  ინტერნეტ კავშირის პრობლემა ან API შეცდომა');
  }

  console.log('═══════════════════════════════════════════════════════\n');
}

checkInstagramId();
