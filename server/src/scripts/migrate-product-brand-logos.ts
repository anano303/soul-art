import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { UsersService } from '../users/services/users.service';
import { ProductsService } from '../products/services/products.service';

async function migrateProductBrandLogos() {
  console.log('Starting product brand logo migration...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const productsService = app.get(ProductsService);

  try {
    // Get direct access to the user model to find all sellers
    const userModel = (usersService as any).userModel;

    if (!userModel) {
      throw new Error('Could not access user model');
    }

    // Find all sellers with their current logo paths
    const allSellers = await userModel.find({ role: 'seller' }).exec();
    console.log(`Found ${allSellers.length} sellers to check`);

    // Create a map of seller names to their current logo paths
    const sellerLogosMap = new Map<string, string>();
    allSellers.forEach((seller) => {
      if (seller.storeLogoPath) {
        sellerLogosMap.set(seller.name, seller.storeLogoPath);
        console.log(`Seller "${seller.name}" -> ${seller.storeLogoPath}`);
      }
    });

    // Get the product model to perform bulk updates
    const productModel = (productsService as any).productModel;

    if (!productModel) {
      throw new Error('Could not access product model');
    }

    // Find all products with S3 brand logos
    const productsWithS3BrandLogos = await productModel
      .find({
        brandLogo: { $regex: 's3.*amazonaws', $options: 'i' },
      })
      .populate('user', 'name email');

    console.log(
      `\nFound ${productsWithS3BrandLogos.length} products with S3 brand logos to migrate`,
    );

    let successCount = 0;
    let failureCount = 0;

    for (const product of productsWithS3BrandLogos) {
      try {
        const sellerName = product.user?.name;
        const brandName = product.brand;

        console.log(`\nProcessing product: ${product.name} (${product._id})`);
        console.log(`  Brand: ${brandName}`);
        console.log(`  Seller: ${sellerName}`);
        console.log(`  Current Brand Logo: ${product.brandLogo}`);

        // Check if the brand name matches the seller name (which means we should use the seller's logo)
        if (
          sellerName &&
          brandName === sellerName &&
          sellerLogosMap.has(sellerName)
        ) {
          const newLogoUrl = sellerLogosMap.get(sellerName);

          await productModel.updateOne(
            { _id: product._id },
            { brandLogo: newLogoUrl },
          );

          console.log(`  ✅ Updated to: ${newLogoUrl}`);
          successCount++;
        } else {
          // For products where brand name doesn't match seller name, we should still use the seller's logo
          // since the current implementation sets brandLogo to seller's storeLogoPath
          if (sellerName && sellerLogosMap.has(sellerName)) {
            const newLogoUrl = sellerLogosMap.get(sellerName);

            await productModel.updateOne(
              { _id: product._id },
              { brandLogo: newLogoUrl },
            );

            console.log(`  ✅ Updated to seller's logo: ${newLogoUrl}`);
            successCount++;
          } else {
            console.log(
              `  ⚠️ Could not find matching seller logo for brand "${brandName}" and seller "${sellerName}"`,
            );
            failureCount++;
          }
        }
      } catch (error) {
        console.error(
          `  ❌ Failed to update product ${product.name}:`,
          error.message,
        );
        failureCount++;
      }
    }

    console.log('\n=== MIGRATION SUMMARY ===');
    console.log(`Total products processed: ${productsWithS3BrandLogos.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed to update: ${failureCount}`);

    // Verify the migration
    const remainingS3Products = await productModel.find({
      brandLogo: { $regex: 's3.*amazonaws', $options: 'i' },
    });

    console.log(
      `\nRemaining products with S3 brand logos: ${remainingS3Products.length}`,
    );
    if (remainingS3Products.length > 0) {
      console.log('These products still have S3 URLs:');
      remainingS3Products.forEach((product) => {
        console.log(
          `  - ${product.name} (${product._id}): ${product.brandLogo}`,
        );
      });
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await app.close();
  }
}

// Run the migration
if (require.main === module) {
  migrateProductBrandLogos()
    .then(() => {
      console.log('Product brand logo migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Product brand logo migration failed:', error);
      process.exit(1);
    });
}

export { migrateProductBrandLogos };
