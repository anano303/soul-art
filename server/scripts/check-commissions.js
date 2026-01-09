const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  // Check recent orders with sales ref
  const orders = await db.collection('orders').find({
    salesRefCode: { $exists: true, $ne: null }
  }).sort({ createdAt: -1 }).limit(10).toArray();
  
  console.log('Recent orders with salesRefCode:');
  orders.forEach(o => {
    console.log({
      _id: o._id.toString(),
      salesRefCode: o.salesRefCode,
      totalPrice: o.totalPrice,
      status: o.status,
      isPaid: o.isPaid,
      createdAt: o.createdAt
    });
  });
  
  // Check commissions
  const commissions = await db.collection('salescommissions').find({}).sort({ createdAt: -1 }).limit(10).toArray();
  console.log('\nRecent commissions:');
  commissions.forEach(c => {
    console.log({
      _id: c._id.toString(),
      orderId: c.order?.toString(),
      status: c.status,
      amount: c.commissionAmount,
      salesManager: c.salesManager?.toString(),
      createdAt: c.createdAt
    });
  });

  // Check if there are orders without commissions
  console.log('\n--- Checking for orders missing commissions ---');
  for (const order of orders) {
    const commission = await db.collection('salescommissions').findOne({ order: order._id });
    if (!commission) {
      console.log('MISSING COMMISSION for order:', order._id.toString(), 'salesRefCode:', order.salesRefCode);
    }
  }
  
  await mongoose.disconnect();
}

check().catch(console.error);
