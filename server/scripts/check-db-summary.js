'use strict';
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://soulartani:Qazqaz111@soulart.gacy33l.mongodb.net/?appName=SoulArt';
  const client = await MongoClient.connect(uri);
  const db = client.db('test');

  console.log('=== 1. AUCTION ADMINS ===');
  const auctionAdmins = await db.collection('users').find(
    { role: 'auction_admin' },
    { projection: { email: 1, name: 1, phoneNumber: 1, accountNumber: 1 } }
  ).toArray();
  console.log(`Total: ${auctionAdmins.length}`);
  auctionAdmins.forEach(u => console.log(`  ${u.email} | ${u.name || '?'}`));

  console.log('\n=== 2. SELLERS WITH DISCOUNT PERMISSIONS ===');
  const withDiscount = await db.collection('users').find(
    { role: 'seller', defaultReferralDiscount: { $gt: 0 } },
    { projection: { email: 1, name: 1, defaultReferralDiscount: 1, campaignDiscountChoice: 1 } }
  ).toArray();
  console.log(`Total: ${withDiscount.length}`);
  withDiscount.forEach(u => console.log(`  ${u.email} | discount: ${u.defaultReferralDiscount}% | choice: ${u.campaignDiscountChoice || 'none'}`));

  console.log('\n=== 3. TOTAL ORDERS & COMMISSION SUMMARY ===');
  const orders = await db.collection('orders').find({}).toArray();
  const totalOrders = orders.length;
  const byStatus = await db.collection('orders').aggregate([
    { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$totalPrice' } } }
  ]).toArray();

  console.log(`Total orders: ${totalOrders}`);
  byStatus.forEach(s => console.log(`  ${s._id || 'unknown'}: ${s.count} orders, ₾${(s.totalAmount || 0).toFixed(2)}`));

  console.log('\n=== 4. TOP SELLING SELLERS ===');
  const topSellers = await db.collection('orders').aggregate([
    { $group: { _id: '$sellerEmail', count: { $sum: 1 }, totalAmount: { $sum: '$totalPrice' } } },
    { $sort: { totalAmount: -1 } },
    { $limit: 15 }
  ]).toArray();
  topSellers.forEach(s => console.log(`  ${(s._id || 'unknown').padEnd(40)} | orders: ${s.count} | ₾${(s.totalAmount || 0).toFixed(2)}`));

  console.log('\n=== 5. COMMISSIONS (if tracked separately) ===');
  const commissions = await db.collection('balancetransactions').find(
    { type: { $in: ['commission', 'seller_commission', 'sale'] } }
  ).toArray();
  console.log(`Commission records: ${commissions.length}`);

  await client.close();
}

main().catch(e => console.error(e.message));
