const mongoose = require('mongoose');

const AUCTION_ID = process.argv[2] || '6988afd8ee4eb609b4283791';

mongoose
  .connect('mongodb://localhost:27017/soulart')
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
