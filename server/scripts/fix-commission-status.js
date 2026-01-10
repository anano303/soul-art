const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('Fixing commission statuses...');

  // Update all lowercase statuses to uppercase
  const result1 = await db
    .collection('salescommissions')
    .updateMany({ status: 'pending' }, { $set: { status: 'PENDING' } });
  console.log('Fixed pending:', result1.modifiedCount);

  const result2 = await db
    .collection('salescommissions')
    .updateMany({ status: 'approved' }, { $set: { status: 'APPROVED' } });
  console.log('Fixed approved:', result2.modifiedCount);

  const result3 = await db
    .collection('salescommissions')
    .updateMany({ status: 'paid' }, { $set: { status: 'PAID' } });
  console.log('Fixed paid:', result3.modifiedCount);

  const result4 = await db
    .collection('salescommissions')
    .updateMany({ status: 'cancelled' }, { $set: { status: 'CANCELLED' } });
  console.log('Fixed cancelled:', result4.modifiedCount);

  // Verify
  const commissions = await db
    .collection('salescommissions')
    .find({})
    .toArray();
  console.log('\nAfter fix:');
  commissions.forEach((c) => {
    console.log('Status:', c.status, 'Amount:', c.commissionAmount);
  });

  await mongoose.disconnect();
  console.log('\nDone!');
}

fix().catch(console.error);
