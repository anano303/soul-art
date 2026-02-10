// Script to set a user's role to auction_admin
// Usage: node scripts/set-auction-admin.js <email>

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function setAuctionAdmin() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: node scripts/set-auction-admin.js <user-email>');
    console.log('Example: node scripts/set-auction-admin.js admin@soulart.ge');
    process.exit(1);
  }

  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');

    // Find user by email
    const user = await usersCollection.findOne({ email: email });
    
    if (!user) {
      console.error(`User with email "${email}" not found`);
      process.exit(1);
    }

    console.log(`Found user: ${user.name || user.email}`);
    console.log(`Current role: ${user.role}`);

    // Update role to auction_admin
    const result = await usersCollection.updateOne(
      { email: email },
      { $set: { role: 'auction_admin' } }
    );

    console.log(`Updated: ${result.modifiedCount} document(s)`);
    console.log(`User "${email}" is now an Auction Admin`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

setAuctionAdmin();
