'use strict';
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'soulart';

async function main() {
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  const total = await db.collection('users').countDocuments();
  const byRole = await db.collection('users').aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  console.log('Total users:', total);
  console.log('By role:');
  byRole.forEach(r => console.log(`  ${String(r._id || 'null').padEnd(25)} : ${r.count}`));

  await client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
