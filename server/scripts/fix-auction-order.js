// Fix auction order - add seller field to existing order
// Usage: node scripts/fix-auction-order.js <auctionId>

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function fixAuctionOrder() {
  const auctionId = process.argv[2];
  
  if (!auctionId) {
    console.log('Usage: node scripts/fix-auction-order.js <auctionId>');
    console.log('Example: node scripts/fix-auction-order.js 6985861597785a099494119f');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const auctions = db.collection('auctions');
    const orders = db.collection('orders');

    // Find the auction
    const auction = await auctions.findOne({ _id: new ObjectId(auctionId) });
    
    if (!auction) {
      console.log('Auction not found:', auctionId);
      process.exit(1);
    }

    console.log('\n=== Auction Info ===');
    console.log('ID:', auction._id.toString());
    console.log('Title:', auction.title);
    console.log('Seller:', auction.seller?.toString());
    console.log('Winner:', auction.currentWinner?.toString());
    console.log('Is Paid:', auction.isPaid);
    console.log('Status:', auction.status);
    console.log('Seller Earnings:', auction.sellerEarnings);

    // Find order for this auction
    const order = await orders.findOne({ auctionId: new ObjectId(auctionId) });

    if (!order) {
      console.log('\n❌ No order found for this auction');
      console.log('Order may not have been created during payment callback');
      process.exit(1);
    }

    console.log('\n=== Existing Order ===');
    console.log('Order ID:', order._id.toString());
    console.log('User:', order.user?.toString());
    console.log('Seller in order:', order.seller?.toString() || 'NOT SET');
    console.log('Status:', order.status);
    console.log('Is Paid:', order.isPaid);

    // Check if seller is already set
    if (order.seller) {
      console.log('\n✅ Order already has seller set');
      process.exit(0);
    }

    // Update order with seller
    console.log('\n=== Fixing Order ===');
    
    const updateResult = await orders.updateOne(
      { _id: order._id },
      {
        $set: {
          seller: auction.seller,
          'orderItems.0.seller': auction.seller,
        }
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log('✅ Order updated successfully!');
      console.log('Added seller:', auction.seller?.toString());
    } else {
      console.log('❌ Failed to update order');
    }

    // Verify the update
    const updatedOrder = await orders.findOne({ _id: order._id });
    console.log('\n=== Updated Order ===');
    console.log('Seller in order:', updatedOrder.seller?.toString());

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

fixAuctionOrder();
