require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function recalculateBalance() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const sellerId = new ObjectId('68e9e11bf100794100883461');

  // Get all transactions
  const transactions = await db
    .collection('balancetransactions')
    .find({ seller: sellerId })
    .sort({ createdAt: 1 })
    .toArray();

  console.log('=== ANALYZING TRANSACTIONS ===');

  // Group transactions by order and type to find duplicates
  const orderGroups = {};
  transactions.forEach((t) => {
    const key = `${t.order}_${t.type}_${t.amount}`;
    if (!orderGroups[key]) {
      orderGroups[key] = [];
    }
    orderGroups[key].push(t);
  });

  // Find and remove duplicate withdrawals
  let duplicateWithdrawals = [];
  for (const [key, group] of Object.entries(orderGroups)) {
    if (group.length > 1 && group[0].type.includes('withdrawal')) {
      console.log('\nFound duplicate withdrawal group:');
      console.log('Key:', key);
      console.log('Count:', group.length);
      // Keep first, mark rest as duplicates
      for (let i = 1; i < group.length; i++) {
        duplicateWithdrawals.push(group[i]);
      }
    }
  }

  // Also check for withdrawal pairs (same amount, close timestamps)
  const withdrawals = transactions.filter((t) => t.type.includes('withdrawal'));
  console.log('\n=== WITHDRAWALS ===');
  withdrawals.forEach((w) => {
    console.log(
      `${w._id} | ${w.type} | ${w.amount} | ${w.createdAt} | ${w.description?.substring(0, 60)}`,
    );
  });

  // Remove duplicate withdrawals
  console.log('\n=== REMOVING DUPLICATE WITHDRAWALS ===');
  for (const dup of duplicateWithdrawals) {
    console.log('Deleting:', dup._id, dup.type, dup.amount);
    await db.collection('balancetransactions').deleteOne({ _id: dup._id });
  }

  // Recalculate correct balance from remaining transactions
  const remainingTransactions = await db
    .collection('balancetransactions')
    .find({ seller: sellerId })
    .sort({ createdAt: 1 })
    .toArray();

  let totalEarnings = 0;
  let totalWithdrawn = 0;

  remainingTransactions.forEach((t) => {
    if (t.type === 'earning') {
      totalEarnings += t.amount;
    } else if (t.type === 'withdrawal_completed') {
      totalWithdrawn += Math.abs(t.amount);
    }
  });

  const correctBalance = totalEarnings - totalWithdrawn;

  console.log('\n=== CORRECT CALCULATIONS ===');
  console.log('Total Earnings:', totalEarnings);
  console.log('Total Withdrawn:', totalWithdrawn);
  console.log('Correct Balance:', correctBalance);

  // Update seller balance
  await db.collection('sellerbalances').updateOne(
    { seller: sellerId },
    {
      $set: {
        totalBalance: correctBalance,
        totalEarnings: totalEarnings,
        totalWithdrawn: totalWithdrawn,
        pendingWithdrawals: 0,
      },
    },
  );
  console.log('Seller balance updated');

  // Update user balance
  await db
    .collection('users')
    .updateOne({ _id: sellerId }, { $set: { balance: correctBalance } });
  console.log('User balance updated');

  // Verify
  const balance = await db
    .collection('sellerbalances')
    .findOne({ seller: sellerId });
  const user = await db.collection('users').findOne({ _id: sellerId });
  console.log('\n=== FINAL STATE ===');
  console.log('Seller Balance:', balance?.totalBalance);
  console.log('User Balance:', user?.balance);

  await client.close();
}

recalculateBalance().catch(console.error);
