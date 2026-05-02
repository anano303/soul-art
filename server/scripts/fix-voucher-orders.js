const mongoose = require('mongoose');
require('dotenv').config();

const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const crypto = require('crypto');

function generateCode() {
  const segment = (len) =>
    Array.from({ length: len }, () => chars[crypto.randomInt(chars.length)]).join('');
  return `SOUL-${segment(4)}-${segment(4)}`;
}

async function fixVoucher() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const orders = await mongoose.connection.collection('orders').find({
    orderType: 'voucher',
    isPaid: true,
    $or: [{ issuedVoucherCode: null }, { issuedVoucherCode: { $exists: false } }]
  }).toArray();

  console.log('Found paid voucher orders without code:', orders.length);
  orders.forEach(o => console.log('  -', String(o._id), 'amount:', o.issuedVoucherAmount, o.issuedVoucherCurrency));

  for (const order of orders) {
    const code = generateCode();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // Insert voucher
    await mongoose.connection.collection('vouchers').insertOne({
      code,
      amount: order.issuedVoucherAmount,
      currency: order.issuedVoucherCurrency,
      assignedTo: order.user || null,
      isUsed: false,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0,
    });

    // Update order with code
    await mongoose.connection.collection('orders').updateOne(
      { _id: order._id },
      { $set: { issuedVoucherCode: code } }
    );

    console.log(`Fixed order ${order._id} -> voucher code: ${code}`);
  }

  await mongoose.disconnect();
  console.log('Done');
}

fixVoucher().catch(console.error);
