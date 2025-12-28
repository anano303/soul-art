/**
 * Fix products where countInStock doesn't match variants.stock
 * If all variants have stock=0, countInStock should also be 0
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function fixCountInStock() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();

    // Find products where countInStock > 0 but all variants have stock <= 0
    const mismatchProducts = await db
      .collection('products')
      .find({
        'variants.0': { $exists: true },
        countInStock: { $gt: 0 },
      })
      .toArray();

    let fixedCount = 0;

    for (const product of mismatchProducts) {
      // Calculate total variant stock
      const totalVariantStock = product.variants.reduce(
        (sum, v) => sum + (v.stock || 0),
        0,
      );

      // If all variants have 0 stock, set countInStock to 0
      if (totalVariantStock === 0 && product.countInStock > 0) {
        console.log(`Fixing: ${product.name} (${product._id})`);
        console.log(`  countInStock: ${product.countInStock} -> 0`);
        console.log(
          `  variants: [${product.variants.map((v) => v.stock).join(', ')}]`,
        );

        await db
          .collection('products')
          .updateOne({ _id: product._id }, { $set: { countInStock: 0 } });

        fixedCount++;
      }
    }

    console.log(`\nFixed ${fixedCount} products`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixCountInStock();
