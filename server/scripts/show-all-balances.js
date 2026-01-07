require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function showAllBalances() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const sellers = await db.collection('sellerbalances').find({}).toArray();
  
  console.log('=== ALL SELLER BALANCES ===\n');
  
  for (const seller of sellers) {
    const user = await db.collection('users').findOne({ _id: seller.seller });
    console.log(`${user?.name || 'Unknown'} (${seller.seller})`);
    console.log(`  Total Earnings:  ${seller.totalEarnings}`);
    console.log(`  Total Withdrawn: ${seller.totalWithdrawn}`);
    console.log(`  Pending:         ${seller.pendingWithdrawals}`);
    console.log(`  Balance:         ${seller.totalBalance}`);
    console.log(`  User Balance:    ${user?.balance || 0}`);
    console.log('');
  }

  await client.close();
}

showAllBalances().catch(console.error);
