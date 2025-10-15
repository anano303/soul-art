import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GalleryLike, GalleryLikeDocument } from '../schemas/gallery-like.schema';
import { GalleryComment, GalleryCommentDocument } from '../schemas/gallery-comment.schema';
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
    @InjectModel(User.name) 
    private userModel: Model<UserDocument>,
  ) {}

  async toggleLike(
    userId: string, 
    artistId: string, 
    imageUrl: string
  ): Promise<{ isLiked: boolean; likesCount: number }> {
    // Validate that the artist exists and has this image in their gallery
    const artist = await this.userModel.findById(artistId);
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    if (!artist.artistGallery?.includes(imageUrl)) {
      throw new BadRequestException('Image not found in artist gallery');
    }

    // Check if like exists
    const existingLike = await this.galleryLikeModel.findOne({
      userId: new Types.ObjectId(userId),
      artistId: new Types.ObjectId(artistId),
      imageUrl,
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
        imageUrl,
      });
      isLiked = true;
    }

    // Get updated likes count
    const likesCount = await this.galleryLikeModel.countDocuments({
      artistId: new Types.ObjectId(artistId),
      imageUrl,
    });

    return { isLiked, likesCount };
  }

  async addComment(
    userId: string,
    artistId: string,
    imageUrl: string,
    createCommentDto: CreateGalleryCommentDto
  ): Promise<GalleryCommentResponseDto> {
    // Validate that the artist exists and has this image in their gallery
    const artist = await this.userModel.findById(artistId);
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    if (!artist.artistGallery?.includes(imageUrl)) {
      throw new BadRequestException('Image not found in artist gallery');
    }

    // Create the comment
    const comment = await this.galleryCommentModel.create({
      userId: new Types.ObjectId(userId),
      artistId: new Types.ObjectId(artistId),
      imageUrl,
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

    const [comments, total] = await Promise.all([
      this.galleryCommentModel
        .find({
          artistId: new Types.ObjectId(artistId),
          imageUrl,
        })
        .populate('userId', 'name storeName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.galleryCommentModel.countDocuments({
        artistId: new Types.ObjectId(artistId),
        imageUrl,
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

    return { comments: formattedComments, total };
  }

  async getInteractionStats(
    artistId: string,
    imageUrls: string[],
    currentUserId?: string
  ): Promise<GalleryInteractionStatsDto[]> {
    // Get likes and comments counts for all images
    const [likesAggregation, commentsAggregation, userLikes] = await Promise.all([
      this.galleryLikeModel.aggregate([
        {
          $match: {
            artistId: new Types.ObjectId(artistId),
            imageUrl: { $in: imageUrls },
          },
        },
        {
          $group: {
            _id: '$imageUrl',
            count: { $sum: 1 },
          },
        },
      ]),
      this.galleryCommentModel.aggregate([
        {
          $match: {
            artistId: new Types.ObjectId(artistId),
            imageUrl: { $in: imageUrls },
          },
        },
        {
          $group: {
            _id: '$imageUrl',
            count: { $sum: 1 },
          },
        },
      ]),
      currentUserId
        ? this.galleryLikeModel
            .find({
              userId: new Types.ObjectId(currentUserId),
              artistId: new Types.ObjectId(artistId),
              imageUrl: { $in: imageUrls },
            })
            .select('imageUrl')
            .exec()
        : [],
    ]);

    // Create lookup maps
    const likesMap = new Map(likesAggregation.map(item => [item._id, item.count]));
    const commentsMap = new Map(commentsAggregation.map(item => [item._id, item.count]));
    const userLikesSet = new Set(userLikes.map(like => like.imageUrl));

    // Return stats for each image
    return imageUrls.map(imageUrl => ({
      imageUrl,
      likesCount: likesMap.get(imageUrl) || 0,
      commentsCount: commentsMap.get(imageUrl) || 0,
      isLikedByUser: userLikesSet.has(imageUrl),
    }));
  }
}