const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Add isActive:true to vouchers missing the field
  const r1 = await mongoose.connection.collection('vouchers').updateMany(
    { isActive: { $exists: false } },
    { $set: { isActive: true } }
  );
  console.log('Added isActive to vouchers:', r1.modifiedCount);

  // Fix 1-lari test vouchers (set isActive + isUsed:false)
  const r2 = await mongoose.connection.collection('vouchers').updateMany(
    { amount: 1 },
    { $set: { isActive: true, isUsed: false } }
  );
  console.log('Fixed 1-lari test vouchers:', r2.modifiedCount);

  // Show current state of all vouchers
  const all = await mongoose.connection.collection('vouchers').find({}).toArray();
  all.forEach(v => console.log(`  ${v.code} | amount:${v.amount} | isUsed:${v.isUsed} | isActive:${v.isActive} | expires:${v.expiresAt}`));

  await mongoose.disconnect();
  console.log('Done');
}
fix().catch(console.error);
