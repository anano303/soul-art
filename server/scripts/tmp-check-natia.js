require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db('test');

  // Search by FB slug and broader patterns
  const users = await db.collection('users').find({
    $or: [
      { slug: 'natialobzhanidze' },
      { artistSlug: 'natialobzhanidze' },
      { slug: /lobja|lobzh/i },
      { artistSlug: /lobja|lobzh/i },
      { storeName: /ლობჟანიძე|ლობჯანიძე/i },
      { name: /ლობჟანიძე|ლობჯანიძე/i }
    ]
  }).toArray();
  
  // Also check products with natialobzhanidze brand
  const fbProducts = await db.collection('products').find({
    $or: [
      { brand: /ლობჟანიძე|ლობჯანიძე/i },
      { brand: /ნათია/i }
    ]
  }).toArray();
  console.log('Products with natia brand:', fbProducts.length);
  fbProducts.forEach(p => {
    console.log('  -', p._id.toString(), p.title, '| brand:', p.brand, '| user:', p.user?.toString(), '| status:', p.status);
  });
  
  const user = users[0];

  if (user) {
    console.log('=== USER ===');
    console.log('  _id:', user._id.toString());
    console.log('  email:', user.email);
    console.log('  name:', user.name);
    console.log('  role:', user.role);
    console.log('  slug:', user.slug);
    console.log('  artistSlug:', user.artistSlug);
    console.log('  storeName:', user.storeName);
    console.log('  sellerApprovedAt:', user.sellerApprovedAt ? 'YES' : 'NO');

    const products = await db.collection('products').find({ user: user._id }).toArray();
    console.log('\n=== PRODUCTS (' + products.length + ') ===');
    products.forEach(p => {
      console.log('  -', p.title, '| brand:', p.brand, '| status:', p.status, '| delivery:', p.deliveryType, (p.minDeliveryDays || '?') + '-' + (p.maxDeliveryDays || '?'), 'days');
    });
  } else {
    console.log('Natia Lobjanidze not found by slug/email. Searching broader...');
    const candidates = await db.collection('users').find({
      $or: [
        { storeName: /ნათია/i },
        { name: /ნათია/i },
        { slug: /natia/i }
      ]
    }).toArray();
    candidates.forEach(u => {
      console.log('  Candidate:', u.email, '| slug:', u.slug, '| storeName:', u.storeName, '| role:', u.role);
    });
  }

  await client.close();
})();
