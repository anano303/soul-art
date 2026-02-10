// Send test auction payment emails manually
// Usage: node scripts/send-test-auction-emails.js <auctionId>

const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
require('dotenv').config();

const auctionId = process.argv[2] || '6985861597785a099494119f';

async function sendEmails() {
  console.log('📧 Sending Test Auction Payment Emails');
  console.log('='.repeat(50));

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get auction
    const auction = await db.collection('auctions').findOne({
      _id: new mongoose.Types.ObjectId(auctionId),
    });

    if (!auction) {
      console.log('❌ Auction not found');
      return;
    }

    console.log('📋 Auction:', auction.title);

    // Get users
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

    // Get auction admin settings
    const settings = await db.collection('auctionadminsettings').findOne({});
    const auctionAdmin = settings?.auctionAdminUserId
      ? await db.collection('users').findOne({
          _id: new mongoose.Types.ObjectId(
            settings.auctionAdminUserId.toString(),
          ),
        })
      : null;

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Verify connection
    try {
      await transporter.verify();
      console.log('✅ Email connection verified');
    } catch (error) {
      console.log('❌ Email connection failed:', error.message);
      return;
    }

    const fromEmail = process.env.EMAIL_USER || 'noreply@soulart.ge';
    const deliveryFee = auction.deliveryFee || 0;
    const totalPayment = auction.currentPrice + deliveryFee;

    // 1. Send to Buyer (Winner)
    if (winner?.email) {
      console.log(`\n📧 Sending to BUYER: ${winner.email}`);
      try {
        await transporter.sendMail({
          from: fromEmail,
          to: winner.email,
          subject: `✅ გადახდა დადასტურდა - ${auction.title}`,
          html: `
            <h1>გადახდა დადასტურდა!</h1>
            <p>თქვენი გადახდა აუქციონზე <strong>"${auction.title}"</strong> წარმატებით მიიღო.</p>
            <p><strong>გადახდილი თანხა:</strong> ${totalPayment} ₾</p>
            <p>მადლობა რომ ირჩევთ SoulArt-ს!</p>
          `,
        });
        console.log('   ✅ Email sent to buyer');
      } catch (error) {
        console.log('   ❌ Failed:', error.message);
      }
    }

    // 2. Send to Seller
    if (seller?.email) {
      console.log(`\n📧 Sending to SELLER: ${seller.email}`);
      try {
        await transporter.sendMail({
          from: fromEmail,
          to: seller.email,
          subject: `💰 გადახდა მიღებულია - ${auction.title}`,
          html: `
            <h1>გადახდა მიღებულია!</h1>
            <p>აუქციონზე <strong>"${auction.title}"</strong> გადახდა წარმატებით მიიღო.</p>
            <p><strong>თქვენი შემოსავალი:</strong> ${auction.sellerEarnings} ₾</p>
            <p>თანხა დაემატა თქვენს ბალანსს.</p>
          `,
        });
        console.log('   ✅ Email sent to seller');
      } catch (error) {
        console.log('   ❌ Failed:', error.message);
      }
    }

    // 3. Send to Auction Admin
    if (auctionAdmin?.email) {
      const adminCommission =
        (auction.currentPrice *
          (settings?.auctionAdminCommissionPercent || 30)) /
        100;
      console.log(`\n📧 Sending to AUCTION ADMIN: ${auctionAdmin.email}`);
      try {
        await transporter.sendMail({
          from: fromEmail,
          to: auctionAdmin.email,
          subject: `✅ აუქციონის გადახდა - ${auction.title}`,
          html: `
            <h1>გადახდა დადასტურდა!</h1>
            <p>აუქციონზე <strong>"${auction.title}"</strong> გადახდა მიღებულია.</p>
            <p><strong>თქვენი საკომისიო:</strong> ${adminCommission} ₾</p>
          `,
        });
        console.log('   ✅ Email sent to auction admin');
      } catch (error) {
        console.log('   ❌ Failed:', error.message);
      }
    }

    // 4. Send to Main Admin
    const mainAdminEmail =
      process.env.ADMIN_EMAIL || 'soulartgeorgia@gmail.com';
    console.log(`\n📧 Sending to MAIN ADMIN: ${mainAdminEmail}`);
    try {
      await transporter.sendMail({
        from: fromEmail,
        to: mainAdminEmail,
        subject: `📊 აუქციონის გადახდა - ${auction.title}`,
        html: `
          <h1>აუქციონის გადახდა</h1>
          <p>აუქციონზე <strong>"${auction.title}"</strong> გადახდა მიღებულია.</p>
          <p><strong>სულ თანხა:</strong> ${totalPayment} ₾</p>
          <p><strong>გამყიდველი:</strong> ${seller?.name || seller?.storeName || 'უცნობი'}</p>
          <p><strong>მყიდველი:</strong> ${winner?.name || 'უცნობი'}</p>
        `,
      });
      console.log('   ✅ Email sent to main admin');
    } catch (error) {
      console.log('   ❌ Failed:', error.message);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Test emails completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

sendEmails();
