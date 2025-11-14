import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GalleryLike, GalleryLikeDocument } from '../schemas/gallery-like.schema';
import { GalleryComment, GalleryCommentDocument } from '../schemas/gallery-comment.schema';
import { PortfolioPost, PortfolioPostDocument } from '../schemas/portfolio-post.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { 
  CreateGalleryCommentDto, 
  GalleryCommentResponseDto, 
  GalleryInteractionStatsDto 
} from '../dto/gallery-interaction.dto';

@Injectable()
export class GalleryInteractionService {
  constructor(
    @InjectModel(GalleryLike.name) 
    private galleryLikeModel: Model<GalleryLikeDocument>,
    @InjectModel(GalleryComment.name) 
    private galleryCommentModel: Model<GalleryCommentDocument>,
    @InjectModel(PortfolioPost.name)
    private portfolioPostModel: Model<PortfolioPostDocument>,
    @InjectModel(User.name) 
    private userModel: Model<UserDocument>,
  ) {}

  async toggleLike(
    userId: string, 
    artistId: string, 
    imageUrl: string
  ): Promise<{ isLiked: boolean; likesCount: number }> {
    const { post, imageIndex } = await this.resolvePostByImage(
      artistId,
      imageUrl,
    );

    // Check if like exists
    const existingLike = await this.galleryLikeModel.findOne({
      userId: new Types.ObjectId(userId),
      artistId: new Types.ObjectId(artistId),
      portfolioPostId: post._id,
      imageIndex,
    });

    let isLiked: boolean;

    if (existingLike) {
      // Unlike - remove the like
      await this.galleryLikeModel.deleteOne({ _id: existingLike._id });
      isLiked = false;
    } else {
      // Like - create new like
      await this.galleryLikeModel.create({
        userId: new Types.ObjectId(userId),
        artistId: new Types.ObjectId(artistId),
        portfolioPostId: post._id,
        imageIndex,
        imageUrl,
        productId: post.productId || null,
      });
      isLiked = true;
    }

    // Get updated likes count
    const likesCount = await this.galleryLikeModel.countDocuments({
      portfolioPostId: post._id,
      imageIndex,
    });

    await this.portfolioPostModel
      .findByIdAndUpdate(post._id, { likesCount }, { new: false })
      .exec();

    return { isLiked, likesCount };
  }

  async addComment(
    userId: string,
    artistId: string,
    imageUrl: string,
    createCommentDto: CreateGalleryCommentDto
  ): Promise<GalleryCommentResponseDto> {
    const { post, imageIndex } = await this.resolvePostByImage(
      artistId,
      imageUrl,
    );

    // Create the comment
    const comment = await this.galleryCommentModel.create({
      userId: new Types.ObjectId(userId),
      artistId: new Types.ObjectId(artistId),
      portfolioPostId: post._id,
      imageIndex,
      imageUrl,
      productId: post.productId || null,
      comment: createCommentDto.comment,
    });

    // Populate user data for response
    const populatedComment = await this.galleryCommentModel
      .findById(comment._id)
      .populate('userId', 'name storeName')
      .exec();

    return {
      id: populatedComment._id.toString(),
      userId: populatedComment.userId.toString(),
      artistId: populatedComment.artistId.toString(),
      imageUrl: populatedComment.imageUrl,
      comment: populatedComment.comment,
      createdAt: populatedComment.createdAt!,
      user: {
        name: (populatedComment.userId as any).name,
        storeName: (populatedComment.userId as any).storeName,
      },
    };
  }

  async getComments(
    artistId: string,
    imageUrl: string,
    page = 1,
    limit = 20
  ): Promise<{ comments: GalleryCommentResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const { post, imageIndex } = await this.resolvePostByImage(
      artistId,
      imageUrl,
    );

    const [comments, total] = await Promise.all([
      this.galleryCommentModel
        .find({
          artistId: new Types.ObjectId(artistId),
          portfolioPostId: post._id,
          imageIndex,
        })
        .populate('userId', 'name storeName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.galleryCommentModel.countDocuments({
        artistId: new Types.ObjectId(artistId),
        portfolioPostId: post._id,
        imageIndex,
      }),
    ]);

    const formattedComments = comments.map(comment => ({
      id: comment._id.toString(),
      userId: comment.userId.toString(),
      artistId: comment.artistId.toString(),
      imageUrl: comment.imageUrl,
      comment: comment.comment,
      createdAt: comment.createdAt!,
      user: {
        name: (comment.userId as any).name,
        storeName: (comment.userId as any).storeName,
      },
    }));

    await this.portfolioPostModel
      .findByIdAndUpdate(post._id, { commentsCount: total }, { new: false })
      .exec();

    return { comments: formattedComments, total };
  }

  async getInteractionStats(
    artistId: string,
    imageUrls: string[],
    currentUserId?: string
  ): Promise<GalleryInteractionStatsDto[]> {
    const targetImages = new Set(imageUrls);

    const posts = await this.portfolioPostModel
      .find({
        artistId: new Types.ObjectId(artistId),
        'images.url': { $in: imageUrls },
      })
      .select(['images', 'productId'])
      .exec();

    const imageToPostMap = new Map<
      string,
      { postId: Types.ObjectId; imageIndex: number; productId?: Types.ObjectId | null }
    >();

    posts.forEach((post) => {
      const rawPostId = post._id as unknown as Types.ObjectId | string;
      const postId =
        rawPostId instanceof Types.ObjectId
          ? rawPostId
          : new Types.ObjectId(String(rawPostId));

      (post.images ?? []).forEach((image, index) => {
        if (targetImages.has(image.url) && !imageToPostMap.has(image.url)) {
          imageToPostMap.set(image.url, {
            postId,
            imageIndex: index,
            productId: (post as any).productId || null,
          });
        }
      });
    });

    const postIds = Array.from(
      new Set(Array.from(imageToPostMap.values()).map((value) => value.postId)),
    );

    if (postIds.length === 0) {
      return imageUrls.map((imageUrl) => ({
        imageUrl,
        likesCount: 0,
        commentsCount: 0,
        isLikedByUser: false,
      }));
    }

    const matchStage = {
      portfolioPostId: { $in: postIds },
    } as Record<string, any>;

    if (artistId) {
      matchStage.artistId = new Types.ObjectId(artistId);
    }

    const [likesAggregation, commentsAggregation, userLikes] = await Promise.all([
      this.galleryLikeModel.aggregate([
        {
          $match: matchStage,
        },
        {
          $group: {
            _id: {
              postId: '$portfolioPostId',
              imageIndex: '$imageIndex',
            },
            count: { $sum: 1 },
          },
        },
      ]),
      this.galleryCommentModel.aggregate([
        {
          $match: matchStage,
        },
        {
          $group: {
            _id: {
              postId: '$portfolioPostId',
              imageIndex: '$imageIndex',
            },
            count: { $sum: 1 },
          },
        },
      ]),
      currentUserId
        ? this.galleryLikeModel
            .find({
              userId: new Types.ObjectId(currentUserId),
              artistId: new Types.ObjectId(artistId),
              portfolioPostId: { $in: postIds },
            })
            .select(['imageIndex', 'portfolioPostId'])
            .exec()
        : [],
    ]);

    const keyFor = (postId: Types.ObjectId, imageIndex: number) =>
      `${postId.toString()}::${imageIndex}`;

    const likesMap = new Map<string, number>();
    likesAggregation.forEach((item) => {
      likesMap.set(
        keyFor(item._id.postId, item._id.imageIndex ?? 0),
        item.count,
      );
    });

    const commentsMap = new Map<string, number>();
    commentsAggregation.forEach((item) => {
      commentsMap.set(
        keyFor(item._id.postId, item._id.imageIndex ?? 0),
        item.count,
      );
    });

    const userLikesSet = new Set<string>();
    userLikes.forEach((like) => {
      userLikesSet.add(keyFor(like.portfolioPostId as Types.ObjectId, like.imageIndex ?? 0));
    });

    return imageUrls.map((imageUrl) => {
      const mapping = imageToPostMap.get(imageUrl);
      if (!mapping) {
        return {
          imageUrl,
          likesCount: 0,
          commentsCount: 0,
          isLikedByUser: false,
        };
      }

      const key = keyFor(mapping.postId, mapping.imageIndex);

      return {
        imageUrl,
        likesCount: likesMap.get(key) || 0,
        commentsCount: commentsMap.get(key) || 0,
        isLikedByUser: userLikesSet.has(key),
      };
    });
  }

  private async resolvePostByImage(
    artistId: string,
    imageUrl: string,
  ): Promise<{ post: PortfolioPostDocument; imageIndex: number }> {
    // Resolve image interactions against the structured portfolio post entry.
    const artist = await this.userModel.findById(artistId);
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    const post = await this.portfolioPostModel
      .findOne({
        artistId: new Types.ObjectId(artistId),
        'images.url': imageUrl,
      })
      .exec();

    if (!post) {
      // Fall back to legacy gallery for early adopters
      if (artist.artistGallery?.includes(imageUrl)) {
        throw new BadRequestException(
          'Image exists only in legacy gallery. Please migrate to portfolio posts.',
        );
      }

      throw new BadRequestException('Image not found in artist portfolio');
    }

    const imageIndex = post.images.findIndex((image) => image.url === imageUrl);

    if (imageIndex === -1) {
      throw new BadRequestException('Image not found in artist portfolio');
    }

    return { post, imageIndex };
  }
}