import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { UsersService } from '../users/services/users.service';

async function updateSpecificProduct() {
  console.log('Updating specific product to test frontend refresh...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    const userModel = (usersService as any).userModel;
    const productModel = (usersService as any).productModel;

    // Get the seller
    const seller = await userModel.findOne({ name: 'შპს ანი' });
    if (!seller) {
      console.log('Seller not found');
      return;
    }

    console.log(`Seller: ${seller.name}`);
    console.log(`Current logo: ${seller.storeLogoPath}`);

    // Update the specific product with ID 687ac1a9ee2a1924b812872b
    const productId = '687ac1a9ee2a1924b812872b';
    const newLogoUrl = seller.storeLogoPath; // Use seller's current logo

    const updateResult = await productModel.updateOne(
      { _id: productId },
      { brandLogo: newLogoUrl },
    );

    console.log(`Update result: ${updateResult.modifiedCount} product updated`);

    // Verify the update
    const updatedProduct = await productModel.findById(productId);
    if (updatedProduct) {
      console.log(
        `Product "${updatedProduct.name}" brand logo updated to: ${updatedProduct.brandLogo}`,
      );
    }
  } catch (error) {
    console.error('Update failed:', error);
  } finally {
    await app.close();
  }
}

// Run the update
if (require.main === module) {
  updateSpecificProduct()
    .then(() => {
      console.log('Update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Update failed:', error);
      process.exit(1);
    });
}

export { updateSpecificProduct };
