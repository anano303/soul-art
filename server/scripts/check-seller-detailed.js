/**
 * Detailed check of seller's campaign consent and products timeline
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkSellerDetailed(sellerName) {
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

    console.log('='.repeat(60));
    console.log(`👤 Seller: ${seller.name}`);
    console.log(`📧 Email: ${seller.email}`);
    console.log(`🆔 ID: ${seller._id}`);
    console.log('='.repeat(60));

    console.log('\n📋 Campaign Settings:');
    console.log(
      `   campaignDiscountChoice: ${seller.campaignDiscountChoice || 'NOT SET'}`,
    );
    console.log(
      `   defaultReferralDiscount: ${seller.defaultReferralDiscount || 0}%`,
    );
    console.log(`   sellerApprovedAt: ${seller.sellerApprovedAt || 'NOT SET'}`);

    // Check if there's a campaignConsent subdocument
    if (seller.campaignConsent) {
      console.log('\n📋 Campaign Consent Object:');
      console.log(`   enabled: ${seller.campaignConsent.enabled}`);
      console.log(
        `   discountPercent: ${seller.campaignConsent.discountPercent}%`,
      );
      console.log(`   consentDate: ${seller.campaignConsent.consentDate}`);
    }

    // Get all products for this seller, sorted by creation date
    const allProducts = await productsCollection
      .find({ user: seller._id })
      .sort({ createdAt: 1 })
      .toArray();

    console.log(`\n📦 Total products: ${allProducts.length}`);
    console.log('\n📋 Products Timeline:');
    console.log('-'.repeat(80));

    allProducts.forEach((p, i) => {
      const name = p.name?.ka || p.name?.en || p.brand || 'Unknown';
      const promo = p.referralDiscountPercent || 0;
      const useDefault = p.useArtistDefaultDiscount ? '✓' : '✗';
      const createdAt = p.createdAt
        ? new Date(p.createdAt).toISOString().split('T')[0]
        : 'unknown';

      console.log(
        `${(i + 1).toString().padStart(2)}. [${createdAt}] ${promo > 0 ? '✅' : '❌'} ${promo}% | useDefault:${useDefault} | ${name.substring(0, 40)}`,
      );
    });

    console.log('-'.repeat(80));

    // Summary
    const withPromo = allProducts.filter(
      (p) => p.referralDiscountPercent && p.referralDiscountPercent > 0,
    );
    const withoutPromo = allProducts.filter(
      (p) => !p.referralDiscountPercent || p.referralDiscountPercent === 0,
    );

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Products WITH promo: ${withPromo.length}`);
    console.log(`   ❌ Products WITHOUT promo: ${withoutPromo.length}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

const searchName = process.argv[2] || 'tornike';
checkSellerDetailed(searchName);
