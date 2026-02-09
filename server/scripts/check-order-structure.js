// Check order structure
const mongoose = require('mongoose');
require('dotenv').config();

const auctionId = '6985861597785a099494119f';

async function checkOrder() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Find all orders with auction in any form
  const allOrders = await db.collection('orders').find({}).limit(10).toArray();
  
  console.log('Total orders sample:', allOrders.length);
  
  for (const order of allOrders) {
    if (order.auction) {
      console.log('\n📦 Order with auction field:', order._id);
      console.log('   auction:', JSON.stringify(order.auction, null, 2).slice(0, 200));
    }
  }

  // Search specifically
  const auctionOrders = await db.collection('orders').find({
    $or: [
      { 'auction.auctionId': auctionId },
      { auctionId: auctionId },
      { 'auction.auctionId': new mongoose.Types.ObjectId(auctionId) },
    ],
  }).toArray();

  console.log('\n\nOrders for auction', auctionId, ':', auctionOrders.length);

  if (auctionOrders.length > 0) {
    console.log(JSON.stringify(auctionOrders[0], null, 2));
  }

  await mongoose.disconnect();
}

checkOrder();
