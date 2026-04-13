require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db('test');

  // Find all sellers
  const sellers = await db.collection('users').find({ role: 'seller' }).toArray();
  console.log(`Total sellers: ${sellers.length}\n`);

  const issues = [];

  for (const seller of sellers) {
    const problems = [];
    
    // Check user-level issues
    if (!seller.slug) problems.push('NO SLUG');
    if (!seller.sellerApprovedAt) problems.push('NO sellerApprovedAt');
    if (!seller.storeName) problems.push('NO storeName');

    // Check products
    const products = await db.collection('products').find({ user: seller._id }).toArray();
    
    const emptyBrand = products.filter(p => !p.brand || p.brand.trim() === '');
    const wrongDelivery = products.filter(p => !p.deliveryType || p.deliveryType === 'SoulArt');
    const noDeliveryDays = products.filter(p => !p.minDeliveryDays || !p.maxDeliveryDays);
    const brandMismatch = products.filter(p => p.brand && seller.storeName && p.brand !== seller.storeName);

    if (emptyBrand.length > 0) problems.push(`${emptyBrand.length}/${products.length} products EMPTY BRAND`);
    if (brandMismatch.length > 0) problems.push(`${brandMismatch.length}/${products.length} products BRAND MISMATCH (store="${seller.storeName}", brands: ${[...new Set(brandMismatch.map(p=>p.brand))].join(', ')})`);
    if (wrongDelivery.length > 0) problems.push(`${wrongDelivery.length}/${products.length} products delivery=SoulArt`);
    if (noDeliveryDays.length > 0) problems.push(`${noDeliveryDays.length}/${products.length} products NO delivery days`);

    if (problems.length > 0) {
      issues.push({
        email: seller.email,
        name: seller.name,
        slug: seller.slug,
        storeName: seller.storeName,
        productCount: products.length,
        problems
      });
    }
  }

  console.log(`=== SELLERS WITH ISSUES: ${issues.length} ===\n`);
  
  // Sort by number of problems (most first)
  issues.sort((a, b) => b.problems.length - a.problems.length);
  
  for (const s of issues) {
    console.log(`${s.email} (${s.name || '?'})`);
    console.log(`  slug: ${s.slug || 'MISSING'}, storeName: ${s.storeName || 'MISSING'}, products: ${s.productCount}`);
    s.problems.forEach(p => console.log(`  ❌ ${p}`));
    console.log();
  }

  await client.close();
})();
