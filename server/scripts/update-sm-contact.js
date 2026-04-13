'use strict';
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI;
  const client = await MongoClient.connect(uri);
  const db = client.db('test');

  // Update sales@gmail.com with phone and account
  const updates = [
    {
      email: 'sales@gmail.com',
      data: {
        phoneNumber: '+995577300480',
        accountNumber: 'GE06BG0000000593139600',
      }
    },
    {
      email: 'salesanni@gmail.com',
      data: {
        phoneNumber: '+995577300480',
      }
    }
  ];

  console.log('🔄 Updating SM contact info...\n');

  for (const update of updates) {
    const result = await db.collection('users').updateOne(
      { email: new RegExp('^' + update.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
      { $set: update.data }
    );

    if (result.matchedCount) {
      console.log(`✅ ${update.email}`);
      Object.entries(update.data).forEach(([key, val]) => {
        console.log(`   ${key}: ${val}`);
      });
    } else {
      console.log(`❌ ${update.email} - not found`);
    }
  }

  console.log('\n✅ Done');
  await client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
