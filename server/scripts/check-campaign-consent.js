const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(
    process.env.MONGODB_URI || 'mongodb://localhost:27017/soul-art',
  );

  // Find sellers with campaignDiscountChoice
  const sellers = await mongoose.connection.db
    .collection('users')
    .find({
      role: 'seller',
    })
    .project({
      email: 1,
      campaignDiscountChoice: 1,
      defaultReferralDiscount: 1,
    })
    .limit(20)
    .toArray();

  console.log('=== Sellers campaign settings ===');
  sellers.forEach((s) => {
    console.log(
      s.email,
      ':',
      s.campaignDiscountChoice,
      '- discount:',
      s.defaultReferralDiscount,
    );
  });

  // Count by campaignDiscountChoice
  const agg = await mongoose.connection.db
    .collection('users')
    .aggregate([
      { $match: { role: 'seller' } },
      { $group: { _id: '$campaignDiscountChoice', count: { $sum: 1 } } },
    ])
    .toArray();

  console.log('\n=== Aggregation result ===');
  console.log(JSON.stringify(agg, null, 2));

  // Also check products with referralDiscountPercent
  const productsWithDiscount = await mongoose.connection.db
    .collection('products')
    .countDocuments({
      referralDiscountPercent: { $gt: 0 },
    });

  console.log('\n=== Products with referralDiscountPercent > 0 ===');
  console.log('Count:', productsWithDiscount);

  await mongoose.disconnect();
}

check().catch(console.error);
