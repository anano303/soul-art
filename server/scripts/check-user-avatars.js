// Check user avatar fields
const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Get some users
  const users = await db
    .collection('users')
    .find({
      $or: [
        { email: 'admin@gmail.com' },
        { role: 'seller' },
        { email: 'mxatvari123@gmail.com' },
      ],
    })
    .limit(10)
    .toArray();

  console.log('User Avatar Fields:');
  console.log('='.repeat(60));

  for (const u of users) {
    console.log('\n📧', u.email || 'no email');
    console.log('   Name:', u.name || u.storeName || 'N/A');
    console.log('   Role:', u.role);
    console.log('   storeLogo:', u.storeLogo || 'N/A');
    console.log('   profileImagePath:', u.profileImagePath || 'N/A');
    console.log('   avatar:', u.avatar || 'N/A');
  }

  // Check auction comments
  console.log('\n\n' + '='.repeat(60));
  console.log('Auction Comments:');

  const auctions = await db
    .collection('auctions')
    .find({
      'comments.0': { $exists: true },
    })
    .limit(3)
    .toArray();

  for (const a of auctions) {
    console.log('\n📦 Auction:', a.title);
    for (const c of a.comments || []) {
      console.log(
        '   Comment by:',
        c.userName,
        '| avatar:',
        c.userAvatar || 'NO AVATAR',
      );
    }
  }

  await mongoose.disconnect();
}

check();
