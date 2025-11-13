import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { Product } from '../products/schemas/product.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';

const logger = new Logger('MigrateArtistRatings');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const productModel = app.get<Model<Product>>(getModelToken(Product.name));

  logger.log('Starting artist ratings migration...');

  try {
    // Find all users with role 'seller'
    const sellers = await userModel
      .find({ role: 'seller' })
      .select('_id username email')
      .exec();

    logger.log(`Found ${sellers.length} sellers to process`);

    let processedCount = 0;
    let updatedCount = 0;

    for (const seller of sellers) {
      try {
        // Get all products by this artist
        const products = await productModel
          .find({ user: seller._id })
          .select('rating numReviews')
          .exec();

        if (products.length === 0) {
          logger.debug(`Seller ${seller._id} has no products, skipping`);
          processedCount++;
          continue;
        }

        // Calculate weighted average
        let totalRating = 0;
        let totalReviews = 0;

        for (const product of products) {
          if (product.rating && product.numReviews > 0) {
            totalRating += product.rating * product.numReviews;
            totalReviews += product.numReviews;
          }
        }

        const artistRating = totalReviews > 0 ? totalRating / totalReviews : 0;

        // Update seller with calculated rating
        await userModel
          .updateOne(
            { _id: seller._id },
            {
              $set: {
                artistRating: Math.round(artistRating * 10) / 10, // Round to 1 decimal
                artistReviewsCount: totalReviews,
              },
            },
          )
          .exec();

        if (artistRating > 0) {
          logger.log(
            `Updated seller ${seller._id}: Rating ${artistRating.toFixed(1)} from ${totalReviews} reviews across ${products.length} products`,
          );
          updatedCount++;
        }

        processedCount++;
      } catch (error) {
        logger.error(`Error processing seller ${seller._id}:`, error);
      }
    }

    logger.log(
      `Migration completed: ${processedCount} sellers processed, ${updatedCount} updated with ratings`,
    );
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

bootstrap();
