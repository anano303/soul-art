// Script to manually restore stock for deleted orders
// Run this only if you know which products need stock restoration
const { MongoClient } = require('mongodb');

async function restoreStock() {
  const client = new MongoClient(
    process.env.MONGODB_URL || 'mongodb://localhost:27017/myhunter',
  );

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const productsCollection = db.collection('products');

    // Example: Restore stock for specific products
    // EDIT THESE VALUES BASED ON YOUR DELETED ORDERS:
    const stockRestorations = [
      // Example:
      // { productId: 'PRODUCT_ID_HERE', size: 'M', color: 'Red', ageGroup: 'Adult', qty: 1 },
      // { productId: 'PRODUCT_ID_HERE', qty: 2 }, // For products without variants
    ];

    if (stockRestorations.length === 0) {
      console.log(
        'No stock restorations defined. Please edit the script with your specific data.',
      );
      return;
    }

    for (const restoration of stockRestorations) {
      const { productId, size, color, ageGroup, qty } = restoration;

      const product = await productsCollection.findOne({ _id: productId });
      if (!product) {
        console.log(`Product ${productId} not found`);
        continue;
      }

      if (size || color || ageGroup) {
        // Restore variant stock
        const variantIndex = product.variants?.findIndex(
          (v) =>
            v.size === size && v.color === color && v.ageGroup === ageGroup,
        );

        if (variantIndex >= 0) {
          await productsCollection.updateOne(
            { _id: productId },
            { $inc: { [`variants.${variantIndex}.stock`]: qty } },
          );
          console.log(
            `Restored ${qty} units to variant ${size}/${color}/${ageGroup} of product ${product.name}`,
          );
        } else {
          console.log(`Variant not found for product ${product.name}`);
        }
      } else {
        // Restore general stock
        await productsCollection.updateOne(
          { _id: productId },
          { $inc: { countInStock: qty } },
        );
        console.log(`Restored ${qty} units to product ${product.name}`);
      }
    }

    console.log('Stock restoration completed');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

restoreStock();
