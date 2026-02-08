const mongoose = require('mongoose');
require('dotenv').config();

const AUCTION_ID = process.argv[2] || '6988afd8ee4eb609b4283791';
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/soulart';

console.log('Connecting to MongoDB...');
console.log('Auction ID:', AUCTION_ID);

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.db
      .collection('auctions')
      .updateOne(
        { _id: new mongoose.Types.ObjectId(AUCTION_ID) },
        { $set: { isPaid: true, paymentDate: new Date() } },
      );

    console.log('Update result:', result);

    // Verify
    const auction = await mongoose.connection.db
      .collection('auctions')
      .findOne({ _id: new mongoose.Types.ObjectId(AUCTION_ID) });
    console.log('Auction isPaid:', auction?.isPaid);

    mongoose.disconnect();
  })
  .catch((e) => console.error(e));
