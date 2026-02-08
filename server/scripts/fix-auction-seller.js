const mongoose = require('mongoose');
require('dotenv').config();

const AUCTION_ID = process.argv[2] || '6988afd8ee4eb609b4283791';

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    // Get auction
    const auction = await mongoose.connection.db
      .collection('auctions')
      .findOne({ _id: new mongoose.Types.ObjectId(AUCTION_ID) });

    if (!auction) {
      console.log('Auction not found');
      return mongoose.disconnect();
    }

    console.log('Current seller:', auction.seller, typeof auction.seller);

    // If seller is a string, convert to ObjectId
    if (typeof auction.seller === 'string') {
      const result = await mongoose.connection.db
        .collection('auctions')
        .updateOne(
          { _id: new mongoose.Types.ObjectId(AUCTION_ID) },
          { $set: { seller: new mongoose.Types.ObjectId(auction.seller) } },
        );
      console.log('Converted seller to ObjectId:', result.modifiedCount);
    } else {
      console.log('Seller is already ObjectId');
    }

    // Verify
    const updated = await mongoose.connection.db
      .collection('auctions')
      .findOne({ _id: new mongoose.Types.ObjectId(AUCTION_ID) });
    console.log('Updated seller:', updated.seller, typeof updated.seller);

    mongoose.disconnect();
  })
  .catch((e) => console.error(e));
