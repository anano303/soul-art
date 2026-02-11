/**
 * Check seller's campaign settings and products
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkSellerPromo(sellerName) {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const productsCollection = db.collection('products');

    // Find the seller by name (case insensitive)
    const seller = await usersCollection.findOne({
      name: { $regex: sellerName, $options: 'i' },
    });

    if (!seller) {
      console.log(`❌ Seller "${sellerName}" not found`);
      return;
    }

    console.log(`👤 Seller: ${seller.name}`);
    console.log(`📧 Email: ${seller.email}`);
    console.log(
      `🎯 Campaign Discount Choice: ${seller.campaignDiscountChoice || 'not set'}`,
    );
    console.log(
      `💰 Default Referral Discount: ${seller.defaultReferralDiscount || 0}%`,
    );

    // Get all products for this seller
    const allProducts = await productsCollection
      .find({ user: seller._id })
      .toArray();
    console.log(`\n📦 Total products: ${allProducts.length}`);

    // Products with promo
    const withPromo = allProducts.filter(
      (p) => p.referralDiscountPercent && p.referralDiscountPercent > 0,
    );
    console.log(`✅ Products with promo discount: ${withPromo.length}`);

    // Products without promo
    const withoutPromo = allProducts.filter(
      (p) => !p.referralDiscountPercent || p.referralDiscountPercent === 0,
    );
    console.log(`❌ Products without promo discount: ${withoutPromo.length}`);

    if (withoutPromo.length > 0 && withoutPromo.length <= 10) {
      console.log('\n📋 Products without promo:');
      withoutPromo.forEach((p, i) => {
        console.log(
          `   ${i + 1}. ${p.name?.ka || p.name?.en || p.brand || 'Unknown'} (created: ${p.createdAt})`,
        );
      });
    }

    if (withPromo.length > 0 && withPromo.length <= 10) {
      console.log('\n📋 Products with promo:');
      withPromo.forEach((p, i) => {
        console.log(
          `   ${i + 1}. ${p.name?.ka || p.name?.en || p.brand || 'Unknown'} - ${p.referralDiscountPercent}% (created: ${p.createdAt})`,
        );
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

const searchName = process.argv[2] || 'tornike';
checkSellerPromo(searchName);
