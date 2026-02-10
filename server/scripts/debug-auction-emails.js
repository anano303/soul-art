// Debug auction email notifications
// Usage: node scripts/debug-auction-emails.js <auctionId>

const mongoose = require('mongoose');
require('dotenv').config();

const auctionId = process.argv[2] || '6985861597785a099494119f';

async function debugEmails() {
  console.log('🔍 Debugging Auction Emails');
  console.log('='.repeat(50));

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // 1. Get Auction
    const auction = await db.collection('auctions').findOne({
      _id: new mongoose.Types.ObjectId(auctionId),
    });

    if (!auction) {
      console.log('❌ Auction not found');
      return;
    }

    console.log('\n📋 AUCTION INFO:');
    console.log(`   Title: ${auction.title}`);
    console.log(`   Status: ${auction.status}`);
    console.log(`   isPaid: ${auction.isPaid}`);
    console.log(`   Seller ID: ${auction.seller}`);
    console.log(`   Winner ID: ${auction.currentWinner}`);
    console.log(`   Price: ${auction.currentPrice} ₾`);
    console.log(`   Seller Earnings: ${auction.sellerEarnings} ₾`);

    // 2. Get Seller
    if (auction.seller) {
      const seller = await db.collection('users').findOne({
        _id: new mongoose.Types.ObjectId(auction.seller.toString()),
      });

      console.log('\n👤 SELLER INFO:');
      if (seller) {
        console.log(`   ID: ${seller._id}`);
        console.log(`   Name: ${seller.name || seller.storeName || 'N/A'}`);
        console.log(`   Email: ${seller.email || 'NO EMAIL!'}`);
        console.log(`   Role: ${seller.role}`);
        console.log(`   All email fields:`);
        for (const key of Object.keys(seller)) {
          if (
            key.toLowerCase().includes('email') ||
            key.toLowerCase().includes('mail')
          ) {
            console.log(`      ${key}: ${seller[key]}`);
          }
        }
      } else {
        console.log('   ❌ Seller not found in database!');
      }
    }

    // 3. Get Winner
    if (auction.currentWinner) {
      const winner = await db.collection('users').findOne({
        _id: new mongoose.Types.ObjectId(auction.currentWinner.toString()),
      });

      console.log('\n🏆 WINNER INFO:');
      if (winner) {
        console.log(`   ID: ${winner._id}`);
        console.log(`   Name: ${winner.name || winner.storeName || 'N/A'}`);
        console.log(`   Email: ${winner.email || 'NO EMAIL!'}`);
        console.log(`   Role: ${winner.role}`);
      } else {
        console.log('   ❌ Winner not found in database!');
      }
    }

    // 4. Get Auction Admin Settings
    const settings = await db.collection('auctionadminsettings').findOne({});

    console.log('\n⚙️ AUCTION ADMIN SETTINGS:');
    if (settings) {
      console.log(
        `   auctionAdminUserId: ${settings.auctionAdminUserId || 'NOT SET!'}`,
      );
      console.log(
        `   auctionAdminCommissionPercent: ${settings.auctionAdminCommissionPercent || 30}`,
      );

      if (settings.auctionAdminUserId) {
        const auctionAdmin = await db.collection('users').findOne({
          _id: new mongoose.Types.ObjectId(
            settings.auctionAdminUserId.toString(),
          ),
        });

        console.log('\n👑 AUCTION ADMIN USER:');
        if (auctionAdmin) {
          console.log(`   ID: ${auctionAdmin._id}`);
          console.log(
            `   Name: ${auctionAdmin.name || auctionAdmin.storeName || 'N/A'}`,
          );
          console.log(`   Email: ${auctionAdmin.email || 'NO EMAIL!'}`);
          console.log(`   Role: ${auctionAdmin.role}`);
        } else {
          console.log('   ❌ Auction admin user not found!');
        }
      }
    } else {
      console.log('   ❌ No auction admin settings found!');
    }

    // 5. Get Main Admin (super admin)
    const mainAdmin = await db.collection('users').findOne({
      $or: [
        { role: 'super_admin' },
        { role: 'admin', isSuperAdmin: true },
        { email: 'admin@soulart.ge' },
        { email: 'admin@gmail.com' },
      ],
    });

    console.log('\n🔑 MAIN ADMIN:');
    if (mainAdmin) {
      console.log(`   ID: ${mainAdmin._id}`);
      console.log(`   Name: ${mainAdmin.name || 'N/A'}`);
      console.log(`   Email: ${mainAdmin.email || 'NO EMAIL!'}`);
      console.log(`   Role: ${mainAdmin.role}`);
    } else {
      console.log('   ❌ Main admin not found');
    }

    // 6. Check Order
    const order = await db.collection('orders').findOne({
      'auction.auctionId': auctionId,
    });

    console.log('\n📦 ORDER INFO:');
    if (order) {
      console.log(`   Order ID: ${order._id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   isPaid: ${order.isPaid}`);
      console.log(`   Seller: ${order.seller || 'MISSING!'}`);
      console.log(`   Buyer: ${order.user}`);
    } else {
      console.log('   ❌ No order found for this auction');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📧 EMAIL SENDING SUMMARY:');
    console.log('='.repeat(50));

    const seller = auction.seller
      ? await db.collection('users').findOne({
          _id: new mongoose.Types.ObjectId(auction.seller.toString()),
        })
      : null;

    const winner = auction.currentWinner
      ? await db.collection('users').findOne({
          _id: new mongoose.Types.ObjectId(auction.currentWinner.toString()),
        })
      : null;

    const auctionAdmin = settings?.auctionAdminUserId
      ? await db.collection('users').findOne({
          _id: new mongoose.Types.ObjectId(
            settings.auctionAdminUserId.toString(),
          ),
        })
      : null;

    console.log(
      `\n1. BUYER EMAIL: ${winner?.email ? '✅ ' + winner.email : '❌ No email'}`,
    );
    console.log(
      `2. SELLER EMAIL: ${seller?.email ? '✅ ' + seller.email : '❌ No email'}`,
    );
    console.log(
      `3. AUCTION ADMIN EMAIL: ${auctionAdmin?.email ? '✅ ' + auctionAdmin.email : '❌ No email or admin not set'}`,
    );
    console.log(
      `4. MAIN ADMIN EMAIL: ${mainAdmin?.email ? '⚠️ NOT IN CODE - ' + mainAdmin.email : '❌ No main admin'}`,
    );

    console.log(
      '\n⚠️ NOTE: Main admin does NOT receive payment confirmation emails!',
    );
    console.log('   Only push notification is sent to main admin.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

debugEmails();
