const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  
  const artist = await User.findOne({ artistSlug: 'natiajanturidze' }).lean();
  if (!artist) {
    console.log('Artist not found');
    process.exit(1);
  }
  
  console.log('Artist ID:', artist._id.toString());
  
  // All approved products
  const allProducts = await Product.find({
    user: artist._id,
    status: 'APPROVED'
  }).select('name countInStock variants').lean();
  
  console.log('\n=== ALL APPROVED PRODUCTS ===');
  console.log('Total:', allProducts.length);
  allProducts.forEach(p => {
    const varStock = p.variants?.reduce((s,v) => s + (v.stock||0), 0) || 0;
    const hasVariants = p.variants && p.variants.length > 0;
    console.log(`- ${p.name}: countInStock=${p.countInStock}, variantStock=${varStock}, hasVariants=${hasVariants}`);
  });
  
  // NEW Query with improved filter
  const filteredProducts = await Product.find({
    user: artist._id,
    status: 'APPROVED',
    $or: [
      // Products WITH variants - at least one variant must have stock > 0
      {
        variants: { $exists: true, $not: { $size: 0 } },
        'variants.stock': { $gt: 0 },
      },
      // Products WITHOUT variants - countInStock must be > 0
      {
        $or: [
          { variants: { $exists: false } },
          { variants: { $size: 0 } },
        ],
        countInStock: { $gt: 0 },
      },
    ],
  }).select('name countInStock variants').lean();
  
  console.log('\n=== FILTERED (IN STOCK) PRODUCTS - NEW QUERY ===');
  console.log('Total:', filteredProducts.length);
  filteredProducts.forEach(p => {
    const varStock = p.variants?.reduce((s,v) => s + (v.stock||0), 0) || 0;
    console.log(`- ${p.name}: countInStock=${p.countInStock}, variantStock=${varStock}`);
  });
  
  // Check specific product
  console.log('\n=== SPECIFIC PRODUCT 6956afceddd970ad98618631 ===');
  const specific = await Product.findById('6956afceddd970ad98618631').lean();
  if (specific) {
    const varStock = specific.variants?.reduce((s,v) => s + (v.stock||0), 0) || 0;
    const hasVariants = specific.variants && specific.variants.length > 0;
    const shouldShow = hasVariants ? varStock > 0 : specific.countInStock > 0;
    console.log(`Name: ${specific.name}`);
    console.log(`countInStock: ${specific.countInStock}`);
    console.log(`variantStock: ${varStock}`);
    console.log(`hasVariants: ${hasVariants}`);
    console.log(`Should show: ${shouldShow}`);
  }
  
  await mongoose.disconnect();
}

check().catch(console.error);
