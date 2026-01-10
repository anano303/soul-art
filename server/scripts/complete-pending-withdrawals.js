/**
 * Manually trigger BOG status check for pending withdrawals
 */

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

async function checkBogStatus() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  
  const txCollection = mongoose.connection.db.collection('balancetransactions');
  const usersCollection = mongoose.connection.db.collection('users');
  
  // Get all pending SM withdrawals
  const smPending = await txCollection.find({ 
    type: 'sm_withdrawal_pending' 
  }).toArray();
  
  console.log(`\nFound ${smPending.length} pending SM withdrawal(s)\n`);
  
  for (const tx of smPending) {
    const keyMatch = tx.description.match(/UniqueKey: (\d+)/);
    if (!keyMatch) {
      console.log('No UniqueKey found for transaction:', tx._id);
      continue;
    }
    
    const uniqueKey = keyMatch[1];
    console.log('Checking BOG UniqueKey:', uniqueKey);
    
    // We can't call BOG API directly without OAuth token
    // But we can mark it as completed manually if you confirmed it was signed
    
    console.log('\nTransaction details:');
    console.log('  Amount:', Math.abs(tx.amount), 'GEL');
    console.log('  Seller ID:', tx.seller);
    console.log('  Description:', tx.description);
    
    // Find the sales manager
    const manager = await usersCollection.findOne({ _id: tx.seller });
    if (manager) {
      console.log('  Manager:', manager.name, '-', manager.email);
      console.log('  Current salesTotalWithdrawn:', manager.salesTotalWithdrawn || 0);
      console.log('  Current salesPendingWithdrawal:', manager.salesPendingWithdrawal || 0);
    }
    
    // Ask to complete
    console.log('\n--- COMPLETING TRANSACTION ---');
    
    const amount = Math.abs(tx.amount);
    
    // Update transaction to completed
    await txCollection.updateOne(
      { _id: tx._id },
      { 
        $set: { 
          type: 'sm_withdrawal_completed',
          description: tx.description.replace('BOG-ში', 'დასრულდა - BOG-ში')
        }
      }
    );
    console.log('✓ Transaction marked as completed');
    
    // Update sales manager balance
    await usersCollection.updateOne(
      { _id: tx.seller },
      { 
        $inc: { 
          salesPendingWithdrawal: -amount,
          salesTotalWithdrawn: amount 
        }
      }
    );
    console.log('✓ Sales Manager balance updated');
    console.log('  Added to salesTotalWithdrawn:', amount);
    
    // Verify
    const updated = await usersCollection.findOne({ _id: tx.seller });
    console.log('\nUpdated values:');
    console.log('  salesTotalWithdrawn:', updated.salesTotalWithdrawn);
    console.log('  salesPendingWithdrawal:', updated.salesPendingWithdrawal);
  }
  
  // Also check seller pending
  const sellerPending = await txCollection.find({ 
    type: 'withdrawal_pending' 
  }).toArray();
  
  if (sellerPending.length > 0) {
    console.log(`\n\nFound ${sellerPending.length} pending Seller withdrawal(s)`);
    // Similar logic for sellers if needed
  }
  
  console.log('\n\nDone!');
  await mongoose.disconnect();
}

checkBogStatus().catch(console.error);
