import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PortfolioPost,
  PortfolioPostDocument,
} from '../schemas/portfolio-post.schema';
import { User, UserDocument } from '../schemas/user.schema';

interface ExploreQueryParams {
  search?: string;
  cursor?: string;
  limit?: string;
}

@Controller('explore')
export class ExploreController {
  constructor(
    @InjectModel(PortfolioPost.name)
    private portfolioPostModel: Model<PortfolioPostDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  @Get()
  async getExplorePosts(@Query() query: ExploreQueryParams) {
    const limit = Math.min(parseInt(query.limit || '30', 10), 100);
    const search = query.search?.trim();
    const cursor = query.cursor;

    try {
      // Build the base filter
      const filter: any = {
        archivedAt: null,
        'images.0': { $exists: true }, // At least one image
      };

      // Add cursor-based pagination
      if (cursor) {
        try {
          const cursorDate = new Date(cursor);
          filter.publishedAt = { $lt: cursorDate };
        } catch (e) {
          throw new BadRequestException('Invalid cursor');
        }
      }

      // Handle search
      if (search) {
        // Search by artist name, caption, or tags
        const artists = await this.userModel
          .find({
            $or: [
              { username: { $regex: search, $options: 'i' } },
              { artistName: { $regex: search, $options: 'i' } },
              { artistSlug: { $regex: search, $options: 'i' } },
            ],
          })
          .select('_id')
          .limit(100);

        const artistIds = artists.map((a) => a._id);

        filter.$or = [
          { artistId: { $in: artistIds } },
          { caption: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } },
        ];
      }

      // Fetch posts with ranking calculation
      const posts = await this.portfolioPostModel
        .find(filter)
        .sort({ publishedAt: -1 })
        .limit(limit + 1)
        .select([
          '_id',
          'artistId',
          'images',
          'caption',
          'likesCount',
          'commentsCount',
          'publishedAt',
          'isFeatured',
          'productId',
          'isSold',
        ])
        .populate({
          path: 'artistId',
          select: 'username artistName artistSlug profileImageUrl name storeName storeLogo storeLogoPath',
        })
        .lean();

      const hasMore = posts.length > limit;
      const resultPosts = posts.slice(0, limit);

      // Calculate ranking score for each post
      const rankedPosts = resultPosts.map((post: any) => {
        const likes = post.likesCount || 0;
        const comments = post.commentsCount || 0;
        const views = 0; // TODO: Implement view tracking

        // Calculate recency multiplier (newer posts get higher scores)
        const ageInDays =
          (Date.now() - new Date(post.publishedAt).getTime()) /
          (1000 * 60 * 60 * 24);
        const recencyMultiplier = Math.max(0.1, 1 / (1 + ageInDays / 30)); // Decay over 30 days

        // Quality multiplier (featured posts get boost)
        const qualityMultiplier = post.isFeatured ? 1.5 : 1;

        // Ranking formula: (likes * 2 + comments * 5 + views * 0.1) * recency * quality
        const score =
          (likes * 2 + comments * 5 + views * 0.1) *
          recencyMultiplier *
          qualityMultiplier;

        return {
          ...post,
          rankingScore: score,
          imageUrl: post.images[0]?.url || '',
        };
      });

      // Sort by ranking score (highest first)
      rankedPosts.sort((a, b) => b.rankingScore - a.rankingScore);

      // Format response
      const formattedPosts = rankedPosts.map((post) => ({
        _id: post._id.toString(),
        imageUrl: post.imageUrl,
        caption: post.caption || '',
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0,
        productId: post.productId ? post.productId.toString() : null,
        isSold: post.isSold || false,
        artist: post.artistId
          ? {
              id: post.artistId._id.toString(),
              username: post.artistId.username,
              artistName: post.artistId.artistName,
              artistSlug: post.artistId.artistSlug,
              profileImageUrl: post.artistId.profileImageUrl,
              name: post.artistId.name,
              storeName: post.artistId.storeName,
              storeLogo: post.artistId.storeLogo,
              storeLogoPath: post.artistId.storeLogoPath,
            }
          : null,
      }));

      return {
        posts: formattedPosts,
        hasMore,
        nextCursor: hasMore
          ? resultPosts[resultPosts.length - 1].publishedAt.toISOString()
          : null,
      };
    } catch (error) {
      console.error('Error fetching explore posts:', error);
      throw new BadRequestException('Failed to fetch explore posts');
    }
  }
}
