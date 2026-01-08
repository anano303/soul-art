require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function checkProduct() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const productId = new ObjectId('695151a72262ea00730709c8');

  const product = await db.collection('products').findOne({ _id: productId });

  console.log('=== PRODUCT DETAILS ===');
  console.log('Name:', product?.name);
  console.log('Brand:', product?.brand);
  console.log('User ID:', product?.user);
  console.log('Status:', product?.status);
  console.log('countInStock:', product?.countInStock);
  console.log('variants:', JSON.stringify(product?.variants));
  console.log('');

  // Check portfolio post
  const portfolio = await db
    .collection('portfolioposts')
    .findOne({ productId: productId });
  console.log('Has Portfolio Post:', portfolio ? 'YES' : 'NO');
  if (portfolio) {
    console.log('Portfolio ID:', portfolio._id);
    console.log('isSold:', portfolio.isSold);
  }

  // Get artist info
  if (product?.user) {
    const artist = await db.collection('users').findOne({ _id: product.user });
    console.log('\n=== ARTIST ===');
    console.log('Name:', artist?.name);
    console.log('artistSlug:', artist?.artistSlug);
  }

  await client.close();
}

checkProduct().catch(console.error);
