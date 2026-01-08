require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function checkPost() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  // This is a portfolio post ID
  const postId = new ObjectId('694ff71d2cfb62c49454d285');

  const post = await db.collection('portfolioposts').findOne({ _id: postId });

  console.log('=== PORTFOLIO POST ===');
  console.log('Post ID:', postId.toString());
  console.log('Artist ID:', post?.artistId);
  console.log('Product ID:', post?.productId);
  console.log('isSold:', post?.isSold);
  console.log('hideBuyButton:', post?.hideBuyButton);
  console.log('Created:', post?.createdAt);
  console.log('');

  // Check the linked product
  if (post?.productId) {
    const product = await db
      .collection('products')
      .findOne({ _id: new ObjectId(post.productId.toString()) });
    console.log('=== LINKED PRODUCT ===');
    console.log('Name:', product?.name);
    console.log('Status:', product?.status);
    console.log('countInStock:', product?.countInStock);
    console.log('variants:', JSON.stringify(product?.variants));
    console.log('Created:', product?.createdAt);
    console.log('Updated:', product?.updatedAt);
  }

  await client.close();
}

checkPost().catch(console.error);
