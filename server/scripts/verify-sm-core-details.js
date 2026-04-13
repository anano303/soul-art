'use strict';

const { MongoClient } = require('mongodb');

async function main() {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db('test');

  const rows = await db.collection('users').find(
    { email: { $in: ['sales@gmail.com', 'salesanni@gmail.com', 'salesani@gmail.com'] } },
    {
      projection: {
        email: 1,
        role: 1,
        phoneNumber: 1,
        accountNumber: 1,
        identificationNumber: 1,
        salesRefCode: 1,
      },
    }
  ).toArray();

  console.log(JSON.stringify(rows, null, 2));
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
