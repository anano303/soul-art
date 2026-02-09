// Check auction payment and email status
// Usage: node scripts/check-auction-payment.js <auctionId>

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkAuctionPayment() {
  const auctionId = process.argv[2];
  
  if (!auctionId) {
    console.log('Usage: node scripts/check-auction-payment.js <auctionId>');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db();
    const auctions = db.collection('auctions');
    const users = db.collection('users');
    const orders = db.collection('orders');

    // Find the auction
    const auction = await auctions.findOne({ _id: new ObjectId(auctionId) });
    
    if (!auction) {
      console.log('Auction not found:', auctionId);
      process.exit(1);
    }

    // Find seller and winner
    const seller = await users.findOne({ _id: auction.seller });
    const winner = auction.currentWinner ? await users.findOne({ _id: auction.currentWinner }) : null;

    console.log('=== AUCTION INFO ===');
    console.log('ID:', auction._id.toString());
    console.log('Title:', auction.title);
    console.log('Status:', auction.status);
    console.log('Is Paid:', auction.isPaid);
    console.log('Payment Date:', auction.paymentDate);
    console.log('Current Price:', auction.currentPrice);
    console.log('Seller Earnings:', auction.sellerEarnings);
    console.log('Delivery Type:', auction.deliveryType);
    console.log('Delivery Fee:', auction.deliveryFee);

    console.log('\n=== SELLER INFO ===');
    console.log('Seller ID:', auction.seller?.toString());
    console.log('Seller Email:', seller?.email || 'NO EMAIL');
    console.log('Seller Name:', seller?.storeName || seller?.name || 'Unknown');

    console.log('\n=== WINNER INFO ===');
    console.log('Winner ID:', auction.currentWinner?.toString());
    console.log('Winner Email:', winner?.email || 'NO EMAIL');
    console.log('Winner Name:', winner?.firstName || winner?.name || 'Unknown');

    console.log('\n=== SHIPPING ADDRESS ===');
    console.log('Address:', JSON.stringify(auction.shippingAddress, null, 2));

    // Check order
    const order = await orders.findOne({ auctionId: new ObjectId(auctionId) });
    console.log('\n=== ORDER INFO ===');
    if (order) {
      console.log('Order ID:', order._id.toString());
      console.log('Order Seller:', order.seller?.toString() || 'NOT SET');
      console.log('Order Status:', order.status);
      console.log('Order isPaid:', order.isPaid);
    } else {
      console.log('❌ No order found for this auction');
    }

    // Email check
    console.log('\n=== EMAIL CAPABILITY CHECK ===');
    console.log('Seller has email:', seller?.email ? '✅ YES' : '❌ NO');
    console.log('Winner has email:', winner?.email ? '✅ YES' : '❌ NO');

    if (!seller?.email) {
      console.log('\n⚠️ WARNING: Seller has no email - payment confirmation email could not be sent!');
    }
    if (!winner?.email) {
      console.log('\n⚠️ WARNING: Winner has no email - payment confirmation email could not be sent!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

checkAuctionPayment();
