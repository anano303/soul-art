/**
 * Migration: Fix Sales Manager pending withdrawals without transactions
 *
 * Problem: Some withdrawal requests were made before transaction logging was added.
 * This script will reset salesPendingWithdrawal to 0 for managers without pending transactions.
 *
 * Run: node scripts/fix-sm-pending-withdrawals.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);

  const usersCollection = mongoose.connection.db.collection('users');
  const txCollection = mongoose.connection.db.collection('balancetransactions');

  // Find all sales managers with pending withdrawals
  const managers = await usersCollection
    .find({
      role: 'sales_manager',
      salesPendingWithdrawal: { $gt: 0 },
    })
    .toArray();

  console.log(
    `\nFound ${managers.length} Sales Manager(s) with pending withdrawals\n`,
  );

  for (const manager of managers) {
    console.log('---');
    console.log('Manager:', manager.name, '-', manager.email);
    console.log('Pending Withdrawal:', manager.salesPendingWithdrawal);

    // Check if there's a corresponding transaction
    const pendingTx = await txCollection.findOne({
      seller: manager._id,
      type: 'sm_withdrawal_pending',
    });

    if (pendingTx) {
      console.log('✓ Has pending transaction with BOG UniqueKey');
      console.log('  Description:', pendingTx.description);
    } else {
      console.log('✗ NO pending transaction found!');
      console.log(
        '  This withdrawal was made before transaction logging was added.',
      );
      console.log('  Options:');
      console.log(
        '  1. Check BOG Business Online if there is a pending document',
      );
      console.log(
        '  2. Reset salesPendingWithdrawal to 0 (refund to available balance)',
      );

      // Ask for confirmation before resetting
      console.log('\n  Resetting salesPendingWithdrawal to 0...');

      await usersCollection.updateOne(
        { _id: manager._id },
        { $set: { salesPendingWithdrawal: 0 } },
      );

      console.log(
        '  ✓ Reset complete. Manager can now request withdrawal again.',
      );
    }
  }

  console.log('\n\nMigration complete!');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
