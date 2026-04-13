const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;

(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  // My register-verification-recipients.js created 169 users at 2026-04-10T16:21
  // Let me find the exact batch window
  const batchUsers = await db.collection('users').find({
    createdAt: { 
      $gte: new Date('2026-04-10T16:21:00Z'),
      $lte: new Date('2026-04-10T16:22:00Z')
    }
  }).sort({ createdAt: 1 }).toArray();

  console.log('Users in batch window (16:21-16:22):', batchUsers.length);
  if (batchUsers.length > 0) {
    console.log('First:', batchUsers[0].createdAt.toISOString(), batchUsers[0].email);
    console.log('Last:', batchUsers[batchUsers.length-1].createdAt.toISOString(), batchUsers[batchUsers.length-1].email);
    
    // Role breakdown
    const roles = {};
    batchUsers.forEach(u => { roles[u.role] = (roles[u.role] || 0) + 1; });
    console.log('Roles:', JSON.stringify(roles));
    
    // Count emails
    console.log('\nTotal emails:', batchUsers.length);
    
    // Check for any weird ones
    const suspicious = batchUsers.filter(u => 
      /admin|support|info@|notifications|sales@|seller/i.test(u.email)
    );
    if (suspicious.length > 0) {
      console.log('\nSuspicious (system-like) emails in batch:');
      suspicious.forEach(u => console.log('  ' + u.email + ' role:' + u.role));
    }
  }

  await client.close();
})();
