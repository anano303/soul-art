require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function checkDuplicates() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  // Find orders with multiple earning transactions for the same product
  const duplicates = await db
    .collection('balancetransactions')
    .aggregate([
      { $match: { type: 'earning' } },
      {
        $group: {
          _id: { order: '$order', description: '$description' },
          count: { $sum: 1 },
          transactions: { $push: '$$ROOT' },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  console.log('Duplicate earning transactions:', duplicates.length);

  if (duplicates.length > 0) {
    for (const dup of duplicates) {
      console.log('\n--- Duplicate ---');
      console.log('Order:', dup._id.order);
      console.log('Count:', dup.count);
      console.log('Description:', dup._id.description);
    }
  } else {
    console.log('✅ No duplicate earning transactions found!');
  }

  // Check for duplicate withdrawal completions
  const withdrawalDups = await db
    .collection('balancetransactions')
    .aggregate([
      { $match: { type: 'withdrawal_completed' } },
      {
        $group: {
          _id: { seller: '$seller', amount: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  console.log(
    '\nDuplicate withdrawal_completed (same seller+amount):',
    withdrawalDups.length,
  );

  await client.close();
}

checkDuplicates().catch(console.error);
