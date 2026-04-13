require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db('test');

  const userId = new ObjectId('69d9238cc7e7440aaa0636da');

  // Fix user: set slug, sellerApprovedAt
  const userUpdate = await db.collection('users').updateOne(
    { _id: userId },
    {
      $set: {
        slug: 'natialobzhanidze',
        sellerApprovedAt: new Date()
      }
    }
  );
  console.log('User updated:', userUpdate.modifiedCount, 'modified');

  // Fix product: set brand and delivery
  const prodUpdate = await db.collection('products').updateMany(
    { user: userId },
    {
      $set: {
        brand: 'ნათია ლობჟანიძე',
        deliveryType: 'SELLER',
        minDeliveryDays: 1,
        maxDeliveryDays: 3
      }
    }
  );
  console.log('Products updated:', prodUpdate.modifiedCount, 'modified');

  // Verify
  const user = await db.collection('users').findOne({ _id: userId });
  console.log('\n=== VERIFIED USER ===');
  console.log('  email:', user.email);
  console.log('  role:', user.role);
  console.log('  slug:', user.slug);
  console.log('  storeName:', user.storeName);
  console.log('  sellerApprovedAt:', user.sellerApprovedAt ? 'YES' : 'NO');

  const products = await db.collection('products').find({ user: userId }).toArray();
  console.log('\n=== VERIFIED PRODUCTS (' + products.length + ') ===');
  products.forEach(p => {
    console.log('  -', p._id.toString(), '| brand:', p.brand, '| delivery:', p.deliveryType, p.minDeliveryDays + '-' + p.maxDeliveryDays, 'days');
  });

  await client.close();
})();
