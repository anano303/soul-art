/**
 * Fix existing products that should have referralDiscountPercent
 *
 * This script finds all sellers with campaignDiscountChoice = 'all'
 * and updates their products that don't have referralDiscountPercent set.
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function fixExistingProductsPromo() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const productsCollection = db.collection('products');

    // Find all sellers with campaignDiscountChoice = 'all' and defaultReferralDiscount > 0
    const sellersWithPromo = await usersCollection
      .find({
        campaignDiscountChoice: 'all',
        defaultReferralDiscount: { $gt: 0 },
      })
      .toArray();

    console.log(
      `\n📊 Found ${sellersWithPromo.length} sellers with promo enabled:\n`,
    );

    let totalFixed = 0;

    for (const seller of sellersWithPromo) {
      console.log(`\n👤 ${seller.name} (${seller.email})`);
      console.log(`   Discount: ${seller.defaultReferralDiscount}%`);

      // Find products without referralDiscountPercent or with 0
      const productsToFix = await productsCollection
        .find({
          user: seller._id,
          $or: [
            { referralDiscountPercent: { $exists: false } },
            { referralDiscountPercent: null },
            { referralDiscountPercent: 0 },
          ],
        })
        .toArray();

      if (productsToFix.length === 0) {
        console.log('   ✅ All products already have promo discount');
        continue;
      }

      console.log(
        `   🔧 Found ${productsToFix.length} products without promo discount`,
      );

      // Update these products
      const result = await productsCollection.updateMany(
        {
          user: seller._id,
          $or: [
            { referralDiscountPercent: { $exists: false } },
            { referralDiscountPercent: null },
            { referralDiscountPercent: 0 },
          ],
        },
        {
          $set: {
            referralDiscountPercent: seller.defaultReferralDiscount,
            useArtistDefaultDiscount: true,
          },
        },
      );

      console.log(`   ✅ Fixed ${result.modifiedCount} products`);
      totalFixed += result.modifiedCount;
    }

    console.log(`\n\n🎉 Total products fixed: ${totalFixed}`);
    console.log('✅ Script completed successfully!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixExistingProductsPromo();
