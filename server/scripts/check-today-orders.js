require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function checkTodayOrders() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  // Today's orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const orders = await db.collection('orders').find({ 
    createdAt: { $gte: today }, 
    isPaid: true 
  }).toArray();

  console.log('=== TODAY PAID ORDERS ===');
  console.log('Total orders:', orders.length);
  console.log('');

  for (const order of orders) {
    console.log(`Order: ${order._id}`);
    console.log(`  Status: ${order.status}`);
    console.log(`  isDelivered: ${order.isDelivered}`);
    console.log(`  Total Price: ${order.totalPrice}`);
    
    for (const item of order.orderItems) {
      const product = await db.collection('products').findOne({ _id: new ObjectId(item.productId) });
      console.log(`  - ${item.name}`);
      console.log(`    Price: ${item.price} x ${item.qty} = ${item.price * item.qty}`);
      console.log(`    DeliveryType: ${product?.deliveryType || 'Unknown'}`);
      
      // Calculate expected earnings
      const itemTotal = item.price * item.qty;
      const siteCommission = itemTotal * 0.1;
      let deliveryCommission = 0;
      if (product?.deliveryType === 'SoulArt') {
        deliveryCommission = Math.min(Math.max(itemTotal * 0.05, 10), 50);
      }
      const sellerEarning = itemTotal - siteCommission - deliveryCommission;
      
      console.log(`    10% Commission: ${siteCommission.toFixed(2)}`);
      console.log(`    Delivery Commission: ${deliveryCommission.toFixed(2)}`);
      console.log(`    Seller Earning: ${sellerEarning.toFixed(2)}`);
    }
    console.log('');
  }

  // Check if earnings are recorded
  console.log('=== TODAY EARNING TRANSACTIONS ===');
  const earnings = await db.collection('balancetransactions').find({
    type: 'earning',
    createdAt: { $gte: today }
  }).toArray();

  console.log('Total earning transactions:', earnings.length);
  earnings.forEach(e => {
    console.log(`  Order: ${e.order} | Amount: ${e.amount} | ${e.description}`);
  });

  await client.close();
}

checkTodayOrders().catch(console.error);
