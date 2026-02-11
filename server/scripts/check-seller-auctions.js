// Check seller auctions
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkSellerAuctions() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!\n');

    const db = mongoose.connection.db;
    
    // Get all auctions with seller info
    const auctions = await db.collection('auctions').find({}).toArray();
    console.log(`Total auctions: ${auctions.length}\n`);
    
    // Group by seller
    const sellerAuctions = {};
    for (const auction of auctions) {
      const sellerId = auction.seller?.toString() || 'no-seller';
      if (!sellerAuctions[sellerId]) {
        sellerAuctions[sellerId] = [];
      }
      sellerAuctions[sellerId].push({
        title: auction.title,
        status: auction.status,
        _id: auction._id.toString(),
      });
    }
    
    console.log('Auctions grouped by seller:');
    for (const [sellerId, auctionsList] of Object.entries(sellerAuctions)) {
      // Get seller info
      let sellerInfo = 'Unknown';
      if (sellerId !== 'no-seller') {
        try {
          const seller = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(sellerId) });
          if (seller) {
            sellerInfo = `${seller.ownerFirstName || ''} ${seller.ownerLastName || ''} (${seller.email || ''}) - role: ${seller.role}`;
          }
        } catch (e) {
          sellerInfo = 'Error fetching seller';
        }
      }
      
      console.log(`\n--- Seller: ${sellerId} ---`);
      console.log(`   Info: ${sellerInfo}`);
      console.log(`   Auctions (${auctionsList.length}):`);
      auctionsList.forEach(a => {
        console.log(`     - ${a.title} [${a.status}] (${a._id})`);
      });
    }

    await mongoose.disconnect();
    console.log('\n\nDone!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSellerAuctions();
