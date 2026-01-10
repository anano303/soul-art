/**
 * Check all pending withdrawal transactions (both seller and sales manager)
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);

  const txCollection = mongoose.connection.db.collection('balancetransactions');

  // Seller pending withdrawals
  const sellerPending = await txCollection
    .find({
      type: 'withdrawal_pending',
    })
    .toArray();

  console.log('\n=== Seller Pending Withdrawals ===');
  console.log('Total:', sellerPending.length);
  sellerPending.forEach((tx) => {
    console.log('---');
    console.log('ID:', tx._id);
    console.log('Amount:', tx.amount);
    console.log('Description:', tx.description);
    const keyMatch = tx.description.match(/UniqueKey: (\d+)/);
    console.log('BOG UniqueKey:', keyMatch ? keyMatch[1] : 'NOT FOUND');
  });

  // Sales Manager pending withdrawals
  const smPending = await txCollection
    .find({
      type: 'sm_withdrawal_pending',
    })
    .toArray();

  console.log('\n=== Sales Manager Pending Withdrawals ===');
  console.log('Total:', smPending.length);
  smPending.forEach((tx) => {
    console.log('---');
    console.log('ID:', tx._id);
    console.log('Amount:', tx.amount);
    console.log('Description:', tx.description);
    const keyMatch = tx.description.match(/UniqueKey: (\d+)/);
    console.log('BOG UniqueKey:', keyMatch ? keyMatch[1] : 'NOT FOUND');
  });

  // All completed withdrawals
  const completed = await txCollection
    .find({
      type: { $in: ['withdrawal_completed', 'sm_withdrawal_completed'] },
    })
    .toArray();

  console.log('\n=== Completed Withdrawals ===');
  console.log('Total:', completed.length);

  await mongoose.disconnect();
}

check().catch(console.error);
