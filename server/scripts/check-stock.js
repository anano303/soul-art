/**
 * Check products that have stock in the database
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkStock() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();

    // Find products that have stock (should appear in shop)
    const productsWithStock = await db
      .collection('products')
      .find(
        {
          status: 'APPROVED',
          $or: [{ countInStock: { $gt: 0 } }, { 'variants.stock': { $gt: 0 } }],
        },
        {
          projection: {
            name: 1,
            countInStock: 1,
            'variants.stock': 1,
            brand: 1,
          },
        },
      )
      .limit(10)
      .toArray();

    console.log('\n=== Products WITH stock (should appear in shop) ===');
    productsWithStock.forEach((p) => {
      const variantStocks = p.variants?.map((v) => v.stock) || [];
      console.log(
        `- ${p.name} | countInStock: ${p.countInStock} | variants: [${variantStocks.join(', ')}]`,
      );
    });

    // Find products from "ნათია ჭანტურიძე" specifically
    const artistProducts = await db
      .collection('products')
      .find(
        {
          brand: { $regex: /ნათია|ჭანტურიძე/i },
          status: 'APPROVED',
        },
        {
          projection: { name: 1, countInStock: 1, variants: 1, brand: 1 },
        },
      )
      .limit(10)
      .toArray();

    console.log('\n=== Products from ნათია ჭანტურიძე ===');
    artistProducts.forEach((p) => {
      const variantStocks = p.variants?.map((v) => v.stock) || [];
      console.log(
        `- ${p.name} | countInStock: ${p.countInStock} | variants: [${variantStocks.join(', ')}]`,
      );
    });

    // Count products with countInStock > 0 but variants.stock = 0
    const mismatchProducts = await db
      .collection('products')
      .find(
        {
          status: 'APPROVED',
          countInStock: { $gt: 0 },
          'variants.0': { $exists: true },
          'variants.stock': { $lte: 0 },
        },
        {
          projection: { name: 1, countInStock: 1, 'variants.stock': 1 },
        },
      )
      .limit(10)
      .toArray();

    console.log(
      '\n=== Products with countInStock > 0 but variants.stock <= 0 (MISMATCH) ===',
    );
    mismatchProducts.forEach((p) => {
      const variantStocks = p.variants?.map((v) => v.stock) || [];
      console.log(
        `- ${p.name} | countInStock: ${p.countInStock} | variants: [${variantStocks.join(', ')}]`,
      );
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkStock();
