const mongoose = require('mongoose');
require('dotenv').config();

async function createMissingCommission() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Find the missing order
  const orderId = '6961754f2354e1117fa36503';
  const order = await db
    .collection('orders')
    .findOne({ _id: new mongoose.Types.ObjectId(orderId) });

  if (!order) {
    console.log('Order not found');
    await mongoose.disconnect();
    return;
  }

  console.log('Order found:', {
    _id: order._id.toString(),
    salesRefCode: order.salesRefCode,
    totalPrice: order.totalPrice,
    status: order.status,
    isPaid: order.isPaid,
  });

  // Check if commission already exists
  const existingCommission = await db.collection('salescommissions').findOne({
    order: new mongoose.Types.ObjectId(orderId),
  });

  if (existingCommission) {
    console.log(
      'Commission already exists:',
      existingCommission._id.toString(),
    );
    await mongoose.disconnect();
    return;
  }

  // Find sales manager
  const salesManager = await db
    .collection('users')
    .findOne({ salesRefCode: order.salesRefCode });

  if (!salesManager) {
    console.log('Sales manager not found for ref code:', order.salesRefCode);
    await mongoose.disconnect();
    return;
  }

  console.log('Sales manager found:', salesManager.email);

  // Calculate commission - use individual rate or default 3%
  const commissionPercent = salesManager.salesCommissionRate || 3;
  const commissionAmount = (order.totalPrice * commissionPercent) / 100;

  // Create commission
  const commission = {
    salesManager: salesManager._id,
    order: order._id,
    customer: order.user || null,
    guestEmail: order.guestInfo?.email || null,
    salesRefCode: order.salesRefCode,
    orderTotal: order.totalPrice,
    commissionPercent: commissionPercent,
    commissionAmount: commissionAmount,
    status: order.status === 'delivered' ? 'APPROVED' : 'PENDING',
    approvedAt: order.status === 'delivered' ? new Date() : null,
    paidAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection('salescommissions').insertOne(commission);
  console.log('Commission created:', result.insertedId.toString());
  console.log('Commission amount:', commissionAmount, 'GEL');
  console.log('Status:', commission.status);

  // Update sales manager balance if approved
  if (commission.status === 'APPROVED') {
    await db.collection('users').updateOne(
      { _id: salesManager._id },
      {
        $inc: {
          salesCommissionBalance: commissionAmount,
          totalSalesCommissions: commissionAmount,
        },
      },
    );
    console.log('Updated sales manager balance');
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

createMissingCommission().catch(console.error);
