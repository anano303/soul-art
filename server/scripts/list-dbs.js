'use strict';
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

async function main() {
  const client = await MongoClient.connect(uri);
  const admin = client.db('admin');
  const dbs = await admin.admin().listDatabases();
  console.log('Available databases:');
  dbs.databases.forEach(d => console.log(`  ${d.name}  (${d.sizeOnDisk} bytes)`));
  await client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
