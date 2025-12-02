#!/usr/bin/env node

/**
 * Instagram ID-ის პოვნა Graph API Explorer-დან
 * 
 * ინსტრუქცია:
 * 1. გადადით: https://developers.facebook.com/tools/explorer/
 * 2. აირჩიეთ თქვენი App და Page Access Token
 * 3. Permissions-ში დაამატეთ: instagram_basic, instagram_content_publish
 * 4. გაუშვით შემდეგი Query:
 *    GET /542501458957000?fields=instagram_business_account{id,username,name}
 * 5. დააკოპირეთ Instagram Account ID აქედან
 */

console.log('═══════════════════════════════════════════════════════');
console.log('  📱 Instagram Account ID-ის პოვნა');
console.log('═══════════════════════════════════════════════════════\n');

console.log('📋 თქვენი ინფორმაცია:');
console.log('   Facebook Page ID: 542501458957000');
console.log('   Instagram: @soulart.ge\n');

console.log('═══════════════════════════════════════════════════════');
console.log('🔗 გადადით Facebook Graph API Explorer-ზე:\n');
console.log('   https://developers.facebook.com/tools/explorer/\n');

console.log('═══════════════════════════════════════════════════════');
console.log('⚙️  Setup ნაბიჯები:\n');

console.log('1️⃣  აირჩიეთ თქვენი Facebook App');
console.log('2️⃣  User or Page → აირჩიეთ "Get Page Access Token"');
console.log('3️⃣  Permissions-ში მონიშნეთ:');
console.log('     ✅ pages_manage_posts');
console.log('     ✅ pages_read_engagement');
console.log('     ✅ instagram_basic');
console.log('     ✅ instagram_content_publish');
console.log('4️⃣  Generate Access Token\n');

console.log('═══════════════════════════════════════════════════════');
console.log('📝 გაუშვით ეს Query:\n');
console.log('   GET /542501458957000?fields=instagram_business_account{id,username,name}\n');

console.log('═══════════════════════════════════════════════════════');
console.log('📋 რას უნდა ნახოთ:\n');
console.log('   {');
console.log('     "instagram_business_account": {');
console.log('       "id": "17841405309211844",  👈 ეს არის ID!');
console.log('       "username": "soulart.ge",');
console.log('       "name": "SoulArt.ge - ..."');
console.log('     },');
console.log('     "id": "542501458957000"');
console.log('   }\n');

console.log('═══════════════════════════════════════════════════════');
console.log('✅ როცა მიიღებთ ID-ს:\n');
console.log('   1. დააკოპირეთ instagram_business_account.id');
console.log('   2. ჩასვით .env ფაილში:');
console.log('      INSTAGRAM_ACCOUNT_ID=თქვენი_ID');
console.log('      INSTAGRAM_AUTO_POST=true');
console.log('   3. დააკოპირეთ ახალი Access Token-ც:');
console.log('      FACEBOOK_POSTS_PAGE_ACCESS_TOKEN=ახალი_token');
console.log('   4. გადატვირთეთ სერვერი\n');

console.log('═══════════════════════════════════════════════════════');
console.log('⚠️  თუ Instagram Account არ გამოჩნდა:\n');
console.log('   • დარწმუნდით რომ Instagram Business Account-ია');
console.log('   • შეამოწმეთ რომ Instagram დაკავშირებულია Page-თან');
console.log('   • Token-ს უნდა ჰქონდეს instagram_basic permission\n');

console.log('═══════════════════════════════════════════════════════');
console.log('🔄 ალტერნატიული გზა - Meta Business Suite:\n');
console.log('   1. გადადით: https://business.facebook.com/');
console.log('   2. აირჩიეთ თქვენი Page');
console.log('   3. Settings → Instagram Accounts');
console.log('   4. ნახეთ დაკავშირებული Account ID\n');

console.log('═══════════════════════════════════════════════════════');
console.log('💡 დახმარება:\n');
console.log('   • Token Debugger: https://developers.facebook.com/tools/debug/accesstoken/');
console.log('   • API Explorer: https://developers.facebook.com/tools/explorer/');
console.log('   • Instagram Setup Guide: INSTAGRAM_SETUP_GUIDE.md\n');

console.log('═══════════════════════════════════════════════════════\n');
