require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function checkWithdrawals() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  // Get all withdrawal_completed with same seller+amount
  const withdrawals = await db
    .collection('balancetransactions')
    .aggregate([
      { $match: { type: 'withdrawal_completed' } },
      {
        $group: {
          _id: { seller: '$seller', amount: '$amount' },
          count: { $sum: 1 },
          transactions: {
            $push: {
              id: '$_id',
              createdAt: '$createdAt',
              description: '$description',
            },
          },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  console.log('Groups with same seller+amount:', withdrawals.length);

  for (const group of withdrawals) {
    console.log('\n--- Group ---');
    console.log('Seller:', group._id.seller);
    console.log('Amount:', group._id.amount);
    console.log('Count:', group.count);
    console.log('Transactions:');
    group.transactions.forEach((t) => {
      console.log(
        `  ${t.id} | ${t.createdAt} | ${t.description?.substring(0, 60)}`,
      );
    });

    // Check if timestamps are too close (< 1 hour) - suspicious
    if (group.transactions.length >= 2) {
      const times = group.transactions
        .map((t) => new Date(t.createdAt).getTime())
        .sort();
      for (let i = 1; i < times.length; i++) {
        const diff = times[i] - times[i - 1];
        if (diff < 3600000) {
          // Less than 1 hour apart
          console.log(
            `  ⚠️ Suspicious: Two transactions ${diff / 1000} seconds apart`,
          );
        }
      }
    }
  }

  await client.close();
}

checkWithdrawals().catch(console.error);
