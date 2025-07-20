import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { UsersService } from '../users/services/users.service';

async function testSellerProductUpdate() {
  console.log('Testing seller product update logic...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    // Get the seller user
    const userModel = (usersService as any).userModel;
    const productModel = (usersService as any).productModel;

    const seller = await userModel.findOne({ name: 'შპს ანი' });

    if (!seller) {
      console.log('Seller "შპს ანი" not found');
      return;
    }

    console.log(`Found seller: ${seller.name} (${seller._id})`);
    console.log(`Current store logo: ${seller.storeLogoPath}`);

    // Find products for this seller
    const products = await productModel.find({ user: seller._id });
    console.log(`Found ${products.length} products for this seller:`);

    products.forEach((product, index) => {
      console.log(`Product ${index + 1}: ${product.name}`);
      console.log(`  Brand: ${product.brand}`);
      console.log(`  Brand Logo: ${product.brandLogo}`);
      console.log(
        `  Brand matches seller name: ${product.brand === seller.name}`,
      );
      console.log('  ---');
    });

    // Test the update query
    const updateQuery = {
      user: seller._id,
      brand: seller.name,
    };

    console.log('Update query:', updateQuery);

    const matchingProducts = await productModel.find(updateQuery);
    console.log(`Products matching update query: ${matchingProducts.length}`);

    // Perform the update
    const newLogoUrl = seller.storeLogoPath; // Use current logo for test
    const updateResult = await productModel.updateMany(updateQuery, {
      brandLogo: newLogoUrl,
    });

    console.log(
      `Update result: ${updateResult.modifiedCount} products updated`,
    );

    // Verify the update
    const updatedProducts = await productModel.find({ user: seller._id });
    console.log('After update:');
    updatedProducts.forEach((product, index) => {
      console.log(`Product ${index + 1}: ${product.name}`);
      console.log(`  Brand Logo: ${product.brandLogo}`);
    });
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await app.close();
  }
}

// Run the test
if (require.main === module) {
  testSellerProductUpdate()
    .then(() => {
      console.log('Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testSellerProductUpdate };
