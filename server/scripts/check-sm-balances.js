const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  console.log(
    'Connecting to:',
    uri ? uri.substring(0, 30) + '...' : 'undefined',
  );
  await mongoose.connect(uri);

  const users = await mongoose.connection.db
    .collection('users')
    .find({ role: 'sales_manager' })
    .toArray();

  console.log('=== Sales Managers ===');
  users.forEach((u) => {
    console.log('---');
    console.log('Name:', u.name);
    console.log('Email:', u.email);
    console.log('salesTotalWithdrawn:', u.salesTotalWithdrawn || 0);
    console.log('salesPendingWithdrawal:', u.salesPendingWithdrawal || 0);
    console.log('salesCommissionBalance:', u.salesCommissionBalance || 0);
  });

  // Check balance transactions
  const txs = await mongoose.connection.db
    .collection('balancetransactions')
    .find({
      type: { $regex: /sm_withdrawal/ },
    })
    .toArray();
  console.log('\n\n=== SM Withdrawal Transactions ===');
  console.log('Total:', txs.length);
  txs.forEach((tx) => {
    console.log('---');
    console.log('Type:', tx.type);
    console.log('Amount:', tx.amount);
    console.log('Description:', tx.description);
    console.log('CreatedAt:', tx.createdAt);
  });

  // Check commissions
  const commissions = await mongoose.connection.db
    .collection('salescommissions')
    .find({})
    .toArray();
  console.log('\n\n=== Sales Commissions ===');
  console.log('Total:', commissions.length);

  const byStatus = {};
  commissions.forEach((c) => {
    const status = c.status || 'unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;
  });
  console.log('By Status:', byStatus);

  await mongoose.disconnect();
}

check().catch(console.error);
