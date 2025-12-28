require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function fixNegativeEarnings() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('=== FIXING NEGATIVE EARNINGS ===\n');

  // Find and fix negative earnings
  const negativeEarnings = await db
    .collection('balancetransactions')
    .find({
      type: 'earning',
      amount: { $lt: 0 },
    })
    .toArray();

  console.log(`Found ${negativeEarnings.length} negative earning transactions`);

  for (const earning of negativeEarnings) {
    console.log(
      `Fixing: ${earning._id} amount: ${earning.amount} -> ${Math.abs(earning.amount)}`,
    );
    await db
      .collection('balancetransactions')
      .updateOne(
        { _id: earning._id },
        { $set: { amount: Math.abs(earning.amount) } },
      );
  }

  console.log('\n=== DONE ===');
  await client.close();
}

fixNegativeEarnings().catch(console.error);
