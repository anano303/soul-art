require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db('test');

  const sellers = await db.collection('users').find({ role: 'seller' }).toArray();
  
  let withProducts = 0;
  let noSlugWithProducts = 0;
  let noApprovalWithProducts = 0;
  let emptyBrandCount = 0;
  let wrongDeliveryCount = 0;
  
  const criticalIssues = [];

  for (const seller of sellers) {
    const products = await db.collection('products').find({ user: seller._id }).toArray();
    if (products.length === 0) continue;
    
    withProducts++;
    const problems = [];
    
    if (!seller.slug) { problems.push('NO SLUG'); noSlugWithProducts++; }
    if (!seller.sellerApprovedAt) { problems.push('NO sellerApprovedAt'); noApprovalWithProducts++; }
    if (!seller.storeName) problems.push('NO storeName');
    
    const emptyBrand = products.filter(p => !p.brand || p.brand.trim() === '');
    const soulartDelivery = products.filter(p => !p.deliveryType || p.deliveryType === 'SoulArt');
    
    if (emptyBrand.length > 0) { problems.push(`${emptyBrand.length} EMPTY BRAND`); emptyBrandCount++; }
    if (soulartDelivery.length > 0) { problems.push(`${soulartDelivery.length}/${products.length} delivery=SoulArt`); wrongDeliveryCount++; }
    
    if (problems.length > 0) {
      criticalIssues.push({
        email: seller.email,
        storeName: seller.storeName,
        slug: seller.slug,
        hasApproval: !!seller.sellerApprovedAt,
        productCount: products.length,
        problems
      });
    }
  }
  
  // Sort by product count (most products first)
  criticalIssues.sort((a, b) => b.productCount - a.productCount);
  
  console.log('=== SUMMARY ===');
  console.log(`Total sellers with products: ${withProducts}`);
  console.log(`Missing slug (can't access panel): ${noSlugWithProducts}`);
  console.log(`Missing sellerApprovedAt (can't edit): ${noApprovalWithProducts}`);
  console.log(`Have products with empty brand: ${emptyBrandCount}`);
  console.log(`Have products with SoulArt delivery: ${wrongDeliveryCount}`);
  console.log(`\n=== ${criticalIssues.length} SELLERS WITH PRODUCTS THAT HAVE ISSUES ===\n`);
  
  for (const s of criticalIssues) {
    const slugInfo = s.slug ? `slug: ${s.slug}` : 'NO SLUG';
    const approvalInfo = s.hasApproval ? '' : ' | NO APPROVAL';
    console.log(`${s.email} | ${s.storeName || '?'} | ${slugInfo}${approvalInfo} | ${s.productCount} products`);
    s.problems.forEach(p => console.log(`  ❌ ${p}`));
  }

  await client.close();
})();
