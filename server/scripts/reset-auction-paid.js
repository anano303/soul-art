const mongoose = require('mongoose');
require('dotenv').config();

async function resetAuctionPaid() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.db.collection('auctions').updateOne(
      { _id: new mongoose.Types.ObjectId('6985861597785a099494119f') },
      { $set: { isPaid: false } }
    );

    console.log('Updated:', result);
    console.log('Modified count:', result.modifiedCount);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetAuctionPaid();
