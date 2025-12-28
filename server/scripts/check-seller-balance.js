require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function checkSellerBalance() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const sellerId = new ObjectId('68e9e11bf100794100883461');

  // Get all transactions
  const transactions = await db
    .collection('balancetransactions')
    .find({ seller: sellerId })
    .sort({ createdAt: 1 })
    .toArray();

  console.log('=== ALL TRANSACTIONS ===');
  let runningBalance = 0;
  transactions.forEach((t) => {
    if (t.type === 'earning') {
      runningBalance += t.amount;
    } else if (t.type.includes('withdrawal')) {
      runningBalance -= Math.abs(t.amount);
    }
    console.log(
      `${t.type}: ${t.amount} | Running: ${runningBalance} | ${t.description?.substring(0, 50)}`,
    );
  });

  // Get seller balance
  const balance = await db
    .collection('sellerbalances')
    .findOne({ seller: sellerId });
  console.log('\n=== SELLER BALANCE ===');
  console.log('Total Balance:', balance?.totalBalance);
  console.log('Total Earnings:', balance?.totalEarnings);
  console.log('Pending Withdrawals:', balance?.pendingWithdrawals);
  console.log('Total Withdrawn:', balance?.totalWithdrawn);

  // Get user balance
  const user = await db.collection('users').findOne({ _id: sellerId });
  console.log('\n=== USER ===');
  console.log('User balance:', user?.balance);
  console.log('Name:', user?.name);

  await client.close();
}

checkSellerBalance().catch(console.error);
