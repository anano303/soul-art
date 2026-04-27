/**
 * Restore Reserved Stock Script
 * 
 * Finds all pending/processing orders and refunds their stock back to products.
 * Then cancels those orders.
 * 
 * Usage:
 *   node scripts/restore-reserved-stock.js          # Dry run (shows what would happen)
 *   node scripts/restore-reserved-stock.js --apply   # Actually restore stock and cancel orders
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://soulartgeorgia_db_user:hzO24rdfnjaT6kWI@soulart.gacy33l.mongodb.net/?appName=SoulArt';
const DRY_RUN = !process.argv.includes('--apply');

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  console.log('Connected to MongoDB');

  if (DRY_RUN) {
    console.log('\n=== DRY RUN MODE (use --apply to execute) ===\n');
  } else {
    console.log('\n=== APPLYING CHANGES ===\n');
  }

  const ordersCol = db.collection('orders');
  const productsCol = db.collection('products');

  // Show order status summary
  const statuses = await ordersCol.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('Orders by status:');
  statuses.forEach(s => console.log(`  ${s._id}: ${s.count}`));

  // Find all pending/processing orders
  const reservedOrders = await ordersCol.find({
    status: { $in: ['pending', 'processing'] }
  }).toArray();

  console.log(`\nFound ${reservedOrders.length} pending/processing orders with reserved stock\n`);

  if (reservedOrders.length === 0) {
    console.log('Nothing to restore.');
    await mongoose.disconnect();
    return;
  }

  let totalItemsRestored = 0;
  let totalOrdersCancelled = 0;
  let errors = [];

  for (const order of reservedOrders) {
    const orderId = order._id.toString();
    const items = order.orderItems || [];
    console.log(`Order ${orderId} (status: ${order.status}, created: ${order.createdAt})`);

    for (const item of items) {
      const productId = item.productId || (item.product && item.product._id ? item.product._id.toString() : null);
      const qty = item.qty || 0;
      const name = item.name || 'Unknown';
      const size = item.size || item.selectedSize || null;
      const color = item.color || item.selectedColor || null;
      const ageGroup = item.ageGroup || null;

      if (!productId || qty <= 0) {
        console.log(`  SKIP: ${name} (no product ID or qty=0)`);
        continue;
      }

      let oid;
      try {
        oid = new mongoose.Types.ObjectId(productId);
      } catch (e) {
        console.log(`  WARN: Invalid product ID "${productId}" for ${name}`);
        errors.push({ orderId, productId, name, error: 'Invalid ObjectId' });
        continue;
      }

      const product = await productsCol.findOne({ _id: oid });
      if (!product) {
        console.log(`  WARN: Product ${productId} (${name}) not found in DB`);
        errors.push({ orderId, productId, name, error: 'Product not found' });
        continue;
      }

      const hasVariants = product.variants && product.variants.length > 0;
      const hasAttributes = size || color || ageGroup;

      if (hasVariants && hasAttributes) {
        // Find matching variant
        const variantIndex = product.variants.findIndex(v => {
          const sizeMatch = !size || v.size === size;
          const colorMatch = !color || v.color === color || v.colorEn === color;
          const ageMatch = !ageGroup || v.ageGroup === ageGroup;
          return sizeMatch && colorMatch && ageMatch;
        });

        if (variantIndex >= 0) {
          const currentStock = product.variants[variantIndex].stock || 0;
          console.log(`  ${name} (variant: size=${size}, color=${color}): +${qty} (${currentStock} -> ${currentStock + qty})`);
          if (!DRY_RUN) {
            await productsCol.updateOne(
              { _id: product._id },
              { $inc: { [`variants.${variantIndex}.stock`]: qty } }
            );
          }
        } else {
          console.log(`  WARN: No matching variant for ${name} (size=${size}, color=${color}, ageGroup=${ageGroup})`);
          // Fallback to countInStock
          const current = product.countInStock || 0;
          console.log(`  Fallback to countInStock: +${qty} (${current} -> ${current + qty})`);
          if (!DRY_RUN) {
            await productsCol.updateOne(
              { _id: product._id },
              { $inc: { countInStock: qty } }
            );
          }
        }
      } else if (hasVariants && !hasAttributes) {
        // Fallback to first variant
        const currentStock = product.variants[0].stock || 0;
        console.log(`  ${name} (first variant fallback): +${qty} (${currentStock} -> ${currentStock + qty})`);
        if (!DRY_RUN) {
          await productsCol.updateOne(
            { _id: product._id },
            { $inc: { 'variants.0.stock': qty } }
          );
        }
      } else {
        // Legacy - countInStock
        const current = product.countInStock || 0;
        console.log(`  ${name}: +${qty} (${current} -> ${current + qty})`);
        if (!DRY_RUN) {
          await productsCol.updateOne(
            { _id: product._id },
            { $inc: { countInStock: qty } }
          );
        }
      }

      totalItemsRestored++;
    }

    // Cancel the order
    if (!DRY_RUN) {
      await ordersCol.updateOne(
        { _id: order._id },
        { 
          $set: { 
            status: 'cancelled',
            stockReservationExpires: null
          } 
        }
      );
    }
    totalOrdersCancelled++;
    console.log(`  -> Order will be cancelled\n`);
  }

  console.log('=== SUMMARY ===');
  console.log(`Orders cancelled: ${totalOrdersCancelled}`);
  console.log(`Items restored: ${totalItemsRestored}`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
    errors.forEach(e => console.log(`  ${e.orderId}: ${e.name} - ${e.error}`));
  }

  if (DRY_RUN) {
    console.log('\n(Dry run - no changes made. Use --apply to execute)');
  } else {
    console.log('\nAll changes applied successfully!');
  }

  await mongoose.disconnect();
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
