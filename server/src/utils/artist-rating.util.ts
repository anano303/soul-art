import { Model } from 'mongoose';
import { Product } from '@/products/schemas/product.schema';
import { User } from '@/users/schemas/user.schema';
import { Logger } from '@nestjs/common';

const logger = new Logger('ArtistRatingUtil');

/**
 * Calculate and update artist rating based on all their product reviews
 */
export async function updateArtistRating(
  userId: string,
  productModel: Model<Product>,
  userModel: Model<User>,
): Promise<{ rating: number; reviewsCount: number }> {
  try {
    // Get all products by this artist
    const products = await productModel
      .find({ user: userId })
      .select('rating numReviews')
      .lean();

    if (!products || products.length === 0) {
      // No products, set rating to 0
      await userModel.updateOne(
        { _id: userId },
        { artistRating: 0, artistReviewsCount: 0 },
      );
      return { rating: 0, reviewsCount: 0 };
    }

    // Calculate weighted average rating
    let totalRating = 0;
    let totalReviews = 0;

    products.forEach((product) => {
      const rating = product.rating || 0;
      const numReviews = product.numReviews || 0;

      if (numReviews > 0) {
        totalRating += rating * numReviews;
        totalReviews += numReviews;
      }
    });

    // Calculate average
    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;
    const roundedRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal

    // Update user's artist rating
    await userModel.updateOne(
      { _id: userId },
      {
        artistRating: roundedRating,
        artistReviewsCount: totalReviews,
      },
    );

    logger.log(
      `Updated artist rating for user ${userId}: ${roundedRating} (${totalReviews} reviews)`,
    );

    return { rating: roundedRating, reviewsCount: totalReviews };
  } catch (error) {
    logger.error(
      `Failed to update artist rating for user ${userId}:`,
      error.message,
    );
    throw error;
  }
}

/**
 * Recalculate ratings for all artists (for migration/maintenance)
 */
export async function recalculateAllArtistRatings(
  productModel: Model<Product>,
  userModel: Model<User>,
): Promise<number> {
  try {
    logger.log('Starting recalculation of all artist ratings...');

    // Get all sellers (artists)
    const artists = await userModel
      .find({ role: 'seller' })
      .select('_id')
      .lean();

    let updatedCount = 0;

    for (const artist of artists) {
      await updateArtistRating(artist._id.toString(), productModel, userModel);
      updatedCount++;
    }

    logger.log(`Recalculated ratings for ${updatedCount} artists`);
    return updatedCount;
  } catch (error) {
    logger.error('Failed to recalculate artist ratings:', error.message);
    throw error;
  }
}
