/**
 * Script to fix products where countInStock is 0 but variants still have stock
 * This can happen when products without size/color/ageGroup attributes were sold
 * but the variant stock wasn't properly decremented.
 * 
 * Usage: node scripts/fix-variant-stock.js
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

// Use MONGODB_URI from .env
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI not found in environment variables');
  process.exit(1);
}

console.log('Using MongoDB URI from .env file...');

async function fixVariantStock() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const productsCollection = db.collection('products');
    
    // Find products where countInStock is 0 but variants have stock > 0
    // and variants don't have size/color/ageGroup attributes
    const problematicProducts = await productsCollection.find({
      countInStock: 0,
      'variants.0': { $exists: true },
      'variants.stock': { $gt: 0 },
      $or: [
        { 'variants.size': { $exists: false } },
        { 'variants.size': null },
        { 'variants.size': '' }
      ]
    }).toArray();
    
    console.log(`Found ${problematicProducts.length} products with mismatched stock`);
    
    for (const product of problematicProducts) {
      // Check if variants have no attributes (just stock)
      const hasNoAttributes = product.variants.every(
        v => !v.size && !v.color && !v.ageGroup
      );
      
      if (hasNoAttributes && product.countInStock === 0) {
        const totalVariantStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        
        if (totalVariantStock > 0) {
          console.log(`\nProduct: ${product.name} (${product._id})`);
          console.log(`  countInStock: ${product.countInStock}`);
          console.log(`  variant stocks: ${product.variants.map(v => v.stock).join(', ')}`);
          console.log(`  Setting all variant stocks to 0...`);
          
          // Update all variant stocks to 0
          const updatedVariants = product.variants.map(v => ({
            ...v,
            stock: 0
          }));
          
          await productsCollection.updateOne(
            { _id: product._id },
            { $set: { variants: updatedVariants } }
          );
          
          console.log(`  ✓ Fixed!`);
        }
      }
    }
    
    // Also fix the specific product if needed
    const specificProductId = '68ea142ef100794100886175';
    const specificProduct = await productsCollection.findOne({ 
      _id: new ObjectId(specificProductId) 
    });
    
    if (specificProduct) {
      console.log(`\nChecking specific product: ${specificProduct.name}`);
      console.log(`  countInStock: ${specificProduct.countInStock}`);
      console.log(`  variants: ${JSON.stringify(specificProduct.variants)}`);
      
      if (specificProduct.countInStock === 0 && 
          specificProduct.variants && 
          specificProduct.variants.some(v => v.stock > 0)) {
        
        const updatedVariants = specificProduct.variants.map(v => ({
          ...v,
          stock: 0
        }));
        
        await productsCollection.updateOne(
          { _id: new ObjectId(specificProductId) },
          { $set: { variants: updatedVariants } }
        );
        
        console.log(`  ✓ Fixed variant stock to 0`);
      } else {
        console.log(`  Already correct or no fix needed`);
      }
    }
    
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixVariantStock();
