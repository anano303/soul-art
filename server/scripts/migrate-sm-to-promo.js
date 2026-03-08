const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb+srv://soulartani:Qazqaz111@soulart.b16ew.mongodb.net/';

async function run() {
  const client = await MongoClient.connect(MONGO_URI);
  const db = client.db();

  // 1. Find all users with SM_ codes
  const usersWithSM = await db.collection('users').find(
    { salesRefCode: { $regex: /^SM_/ } },
    { projection: { _id: 1, name: 1, email: 1, salesRefCode: 1 } }
  ).toArray();

  console.log(`Found ${usersWithSM.length} users with SM_ codes:\n`);

  for (const user of usersWithSM) {
    // Generate new PROMO code
    const num = Math.floor(10000 + Math.random() * 90000);
    const newCode = `PROMO${num}`;

    // Make sure it's unique
    const existing = await db.collection('users').findOne({ salesRefCode: newCode });
    if (existing) {
      console.log(`  SKIP ${user.name} - code ${newCode} already exists, retry needed`);
      continue;
    }

    const oldCode = user.salesRefCode;

    // Update user's salesRefCode
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { salesRefCode: newCode } }
    );

    // Update all orders that reference the old code
    const orderResult = await db.collection('orders').updateMany(
      { salesRefCode: oldCode },
      { $set: { salesRefCode: newCode } }
    );

    // Update all sales commissions
    const commResult = await db.collection('salescommissions').updateMany(
      { salesRefCode: oldCode },
      { $set: { salesRefCode: newCode } }
    );

    // Update all tracking records
    const trackResult = await db.collection('salestrackings').updateMany(
      { salesRefCode: oldCode },
      { $set: { salesRefCode: newCode } }
    );

    // Update all balance transactions
    const balResult = await db.collection('balancetransactions').updateMany(
      { 'metadata.salesRefCode': oldCode },
      { $set: { 'metadata.salesRefCode': newCode } }
    );

    console.log(`  ✅ ${user.name} (${user.email}): ${oldCode} → ${newCode}`);
    console.log(`     Orders: ${orderResult.modifiedCount}, Commissions: ${commResult.modifiedCount}, Tracking: ${trackResult.modifiedCount}, Balance: ${balResult.modifiedCount}`);
  }

  console.log('\n✅ Migration complete!');
  await client.close();
}

run().catch(console.error);
