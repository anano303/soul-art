require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function recalculateAllBalances() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('=== RECALCULATING ALL SELLER BALANCES ===\n');

  // Get all sellers with balances
  const sellers = await db.collection('sellerbalances').find({}).toArray();
  console.log(`Found ${sellers.length} sellers with balances\n`);

  for (const seller of sellers) {
    const sellerId = seller.seller;
    console.log(`--- Seller: ${sellerId} ---`);

    // Get all transactions for this seller
    const transactions = await db
      .collection('balancetransactions')
      .find({ seller: sellerId })
      .toArray();

    // Calculate correct totals
    let totalEarnings = 0;
    let totalWithdrawn = 0;
    let pendingWithdrawals = 0;

    for (const t of transactions) {
      if (t.type === 'earning') {
        totalEarnings += t.amount;
      } else if (t.type === 'withdrawal_completed') {
        totalWithdrawn += Math.abs(t.amount);
      } else if (t.type === 'withdrawal_pending') {
        pendingWithdrawals += Math.abs(t.amount);
      }
    }

    const totalBalance = totalEarnings - totalWithdrawn - pendingWithdrawals;

    console.log(`  Transactions: ${transactions.length}`);
    console.log(
      `  Calculated: earnings=${totalEarnings}, withdrawn=${totalWithdrawn}, pending=${pendingWithdrawals}, balance=${totalBalance}`,
    );
    console.log(
      `  Current:    earnings=${seller.totalEarnings}, withdrawn=${seller.totalWithdrawn}, pending=${seller.pendingWithdrawals}, balance=${seller.totalBalance}`,
    );

    // Check if update needed
    const needsUpdate =
      seller.totalEarnings !== totalEarnings ||
      seller.totalWithdrawn !== totalWithdrawn ||
      seller.pendingWithdrawals !== pendingWithdrawals ||
      seller.totalBalance !== totalBalance;

    if (needsUpdate) {
      console.log('  ⚠️ MISMATCH - Updating...');

      await db.collection('sellerbalances').updateOne(
        { seller: sellerId },
        {
          $set: {
            totalBalance: totalBalance,
            totalEarnings: totalEarnings,
            totalWithdrawn: totalWithdrawn,
            pendingWithdrawals: pendingWithdrawals,
          },
        },
      );

      // Also update user balance
      await db
        .collection('users')
        .updateOne({ _id: sellerId }, { $set: { balance: totalBalance } });

      console.log('  ✅ Updated');
    } else {
      console.log('  ✅ OK');
    }
    console.log('');
  }

  console.log('=== DONE ===');
  await client.close();
}

recalculateAllBalances().catch(console.error);
