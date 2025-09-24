// VAPID Key Generator for Push Notifications
// გაუშვით ეს სკრიპტი VAPID keys-ის გენერირებისთვის

const webpush = require("web-push");

// VAPID Keys-ის გენერირება
const vapidKeys = webpush.generateVAPIDKeys();

console.log("🔐 VAPID Keys Generated:");
console.log("====================================");
console.log("Public Key:");
console.log(vapidKeys.publicKey);
console.log("\nPrivate Key:");
console.log(vapidKeys.privateKey);
console.log("====================================");

console.log("\n📋 ამ Keys-ები დაამატეთ თქვენს .env.local ფაილში:");
console.log("====================================");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log("VAPID_EMAIL=mailto:support@soulart.ge");
console.log("====================================");

console.log("\n✅ Keys წარმატებით გენერირდა!");
console.log("⚠️ Private Key-ი უსაფრთხოების მიზნით არ გაავრცელოთ!");
