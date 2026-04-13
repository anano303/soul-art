const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;

(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  // Find users created since Apr 9 (our scripts ran Apr 9-10)
  const recentUsers = await db.collection('users').find({
    createdAt: { $gte: new Date('2026-04-09T00:00:00Z') }
  }).sort({ createdAt: 1 }).toArray();

  console.log('Users created since Apr 9:', recentUsers.length);
  if (recentUsers.length > 0) {
    console.log('First:', recentUsers[0].createdAt, recentUsers[0].email);
    console.log('Last:', recentUsers[recentUsers.length - 1].createdAt, recentUsers[recentUsers.length - 1].email);

    const roles = {};
    recentUsers.forEach(u => { roles[u.role] = (roles[u.role] || 0) + 1; });
    console.log('Roles:', JSON.stringify(roles));

    // Check timestamps to identify batch
    const timestamps = {};
    recentUsers.forEach(u => {
      const key = new Date(u.createdAt).toISOString().slice(0, 16);
      timestamps[key] = (timestamps[key] || 0) + 1;
    });
    console.log('\nCreation timestamps:');
    Object.entries(timestamps).forEach(([t, c]) => console.log(`  ${t}: ${c} users`));
    
    console.log('\nAll emails:');
    recentUsers.forEach(u => console.log(u.email));
  }

  await client.close();
})();
