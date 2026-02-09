// Check what was created for this auction
const mongoose = require('mongoose');
require('dotenv').config();

const auctionId = '6985861597785a099494119f';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Check auction
  const auction = await db.collection('auctions').findOne({
    _id: new mongoose.Types.ObjectId(auctionId),
  });

  console.log('🔍 AUCTION:');
  console.log('   Title:', auction?.title);
  console.log('   isPaid:', auction?.isPaid);
  console.log('   paymentDate:', auction?.paymentDate);
  console.log('   paymentResult:', JSON.stringify(auction?.paymentResult));
  console.log('   bogOrderId:', auction?.bogOrderId);
  console.log('   externalOrderId:', auction?.externalOrderId);
  console.log('   createdAt:', auction?.createdAt);

  // Check if there are any auction orders
  const auctionOrders = await db.collection('auctionorders').find({
    auctionId: new mongoose.Types.ObjectId(auctionId),
  }).toArray();

  console.log('\n📦 AUCTION ORDERS:', auctionOrders.length);
  if (auctionOrders.length > 0) {
    console.log(JSON.stringify(auctionOrders[0], null, 2));
  }

  // Check regular orders that might be for auction
  const orders = await db.collection('orders').find({}).toArray();
  console.log('\n📦 TOTAL ORDERS:', orders.length);

  // Check for auction-related orders
  for (const order of orders) {
    const orderStr = JSON.stringify(order);
    if (orderStr.includes(auctionId) || orderStr.includes('auction') || order.auction) {
      console.log('\n🔗 Related order found:');
      console.log('   _id:', order._id);
      console.log('   user:', order.user);
      console.log('   seller:', order.seller);
      console.log('   auction:', order.auction);
    }
  }

  await mongoose.disconnect();
}

check();
