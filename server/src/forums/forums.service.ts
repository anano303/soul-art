import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateForumDto } from './dto/create-forum.dto';
import { UpdateForumDto } from './dto/update-forum.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Forum, Comment } from './schema/forum.schema';
import { isValidObjectId, Model, Types } from 'mongoose';
import { UsersService } from '@/users/services/users.service';
import { queryParamsDto } from './dto/queryParams.dto';
import { AwsS3Service } from '@/aws-s3/aws-s3.service';
import { AddCommentDto } from './dto/addComment.dto';
import { SearchForumDto } from './dto/search-forum.dto';
import * as mongoose from 'mongoose';

@Injectable()
export class ForumsService {
  constructor(
    @InjectModel(Forum.name) private forumModel: Model<Forum>,
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    private userService: UsersService,
    private awsS3Service: AwsS3Service,
  ) {}

  async create(createForumDto: CreateForumDto, userId, filePath?, file?) {
    try {
      const user = await this.userService.findById(userId);
      if (!Object.keys(user).length)
        throw new BadRequestException('user not found');
      if ('_id' in user) {
        if (!filePath && !file) {
          const forum = await this.forumModel.create({
            ...createForumDto,
            user: user._id,
          });
          return forum;
        }
        const imagePath = await this.awsS3Service.uploadImage(filePath, file);
        const forum = await this.forumModel.create({
          ...createForumDto,
          user: user._id,
          imagePath,
        });
        return forum;
      }
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
    }
  }

  async findAll(queryParams: queryParamsDto) {
    const { page, take } = queryParams;
    const limit = Math.min(take, 20);

    const forumData = await this.forumModel
      .find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name _id role profileImagePath')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'name _id profileImagePath',
        },
      });

    const forumDataWithImages = await Promise.all(
      forumData.map(async (forum) => {
        // Get forum post image
        const imageUrl = await this.awsS3Service.getImageByFileId(
          forum.imagePath,
        );

        // Get user profile image if available
        let userProfileImage = null;
        const populatedUser = forum.user as any; // Cast to any to access properties

        if (populatedUser) {
          if (populatedUser.profileImagePath) {
            // If it's already a full URL (Cloudinary or other direct URL)
            if (populatedUser.profileImagePath.startsWith('http')) {
              userProfileImage = populatedUser.profileImagePath;
            } else {
              // Use S3 for backward compatibility
              userProfileImage = await this.awsS3Service.getImageByFileId(
                populatedUser.profileImagePath as string,
              );
            }
          } else if (
            populatedUser.role === 'seller' &&
            populatedUser.storeLogoPath
          ) {
            // If seller has no profile image but has store logo, use the logo
            if (populatedUser.storeLogoPath.startsWith('http')) {
              userProfileImage = populatedUser.storeLogoPath;
            } else {
              userProfileImage = await this.awsS3Service.getImageByFileId(
                populatedUser.storeLogoPath as string,
              );
            }
          }
        }

        // Create a safe user object
        const userObj =
          typeof populatedUser === 'string'
            ? { _id: populatedUser, name: 'Unknown', role: 'user' }
            : populatedUser && typeof populatedUser.toObject === 'function'
              ? populatedUser.toObject()
              : populatedUser;

        // Get comment authors profile images
        const commentsWithProfileImages = await Promise.all(
          forum.comments.map(async (comment) => {
            let commentUserProfileImage = null;
            const populatedCommentUser = comment.user as any; // Cast to any

            if (populatedCommentUser) {
              if (populatedCommentUser.profileImagePath) {
                // If it's already a full URL (Cloudinary or other direct URL)
                if (populatedCommentUser.profileImagePath.startsWith('http')) {
                  commentUserProfileImage =
                    populatedCommentUser.profileImagePath;
                } else {
                  // Use S3 for backward compatibility
                  commentUserProfileImage =
                    await this.awsS3Service.getImageByFileId(
                      populatedCommentUser.profileImagePath as string,
                    );
                }
              } else if (
                populatedCommentUser.role === 'seller' &&
                populatedCommentUser.storeLogoPath
              ) {
                // If seller has no profile image but has store logo, use the logo
                if (populatedCommentUser.storeLogoPath.startsWith('http')) {
                  commentUserProfileImage = populatedCommentUser.storeLogoPath;
                } else {
                  commentUserProfileImage =
                    await this.awsS3Service.getImageByFileId(
                      populatedCommentUser.storeLogoPath as string,
                    );
                }
              }
            }

            // Create a safe comment user object
            const commentUserObj =
              typeof populatedCommentUser === 'string'
                ? { _id: populatedCommentUser, name: 'Unknown' }
                : populatedCommentUser &&
                    typeof populatedCommentUser.toObject === 'function'
                  ? populatedCommentUser.toObject()
                  : populatedCommentUser;

            return {
              ...comment.toObject(),
              user: {
                ...commentUserObj,
                profileImage: commentUserProfileImage,
              },
            };
          }),
        );

        return {
          ...forum.toObject(),
          image: imageUrl,
          user: {
            ...userObj,
            profileImage: userProfileImage,
          },
          comments: commentsWithProfileImages,
        };
      }),
    );

    return forumDataWithImages;
  }

  async searchForums(searchParams: SearchForumDto) {
    const { query, page = 1, take = 20 } = searchParams;
    const limit = Math.min(take, 20);

    // If no query, return regular forum list
    if (!query || query.trim() === '') {
      return this.findAll({ page, take });
    }

    // Create search filter for content and comments
    const searchFilter = {
      $or: [
        { content: { $regex: query, $options: 'i' } },
        { 'comments.content': { $regex: query, $options: 'i' } }
      ]
    };

    const forumData = await this.forumModel
      .find(searchFilter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name _id role profileImagePath')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'name _id profileImagePath',
        },
      });

    // Process images same as findAll method
    const forumDataWithImages = await Promise.all(
      forumData.map(async (forum) => {
        // Get forum post image
        const imageUrl = await this.awsS3Service.getImageByFileId(
          forum.imagePath,
        );

        // Get user profile image if available
        let userProfileImage = null;
        const populatedUser = forum.user as any;

        if (populatedUser) {
          if (populatedUser.profileImagePath) {
            if (populatedUser.profileImagePath.startsWith('http')) {
              userProfileImage = populatedUser.profileImagePath;
            } else {
              userProfileImage = await this.awsS3Service.getImageByFileId(
                populatedUser.profileImagePath as string,
              );
            }
          } else if (
            populatedUser.role === 'seller' &&
            populatedUser.storeLogoPath
          ) {
            if (populatedUser.storeLogoPath.startsWith('http')) {
              userProfileImage = populatedUser.storeLogoPath;
            } else {
              userProfileImage = await this.awsS3Service.getImageByFileId(
                populatedUser.storeLogoPath as string,
              );
            }
          }
        }

        const userObj =
          typeof populatedUser === 'string'
            ? { _id: populatedUser, name: 'Unknown', role: 'user' }
            : populatedUser && typeof populatedUser.toObject === 'function'
              ? populatedUser.toObject()
              : populatedUser;

        // Get comment authors profile images
        const commentsWithProfileImages = await Promise.all(
          forum.comments.map(async (comment) => {
            let commentUserProfileImage = null;
            const populatedCommentUser = comment.user as any;

            if (populatedCommentUser) {
              if (populatedCommentUser.profileImagePath) {
                if (populatedCommentUser.profileImagePath.startsWith('http')) {
                  commentUserProfileImage =
                    populatedCommentUser.profileImagePath;
                } else {
                  commentUserProfileImage =
                    await this.awsS3Service.getImageByFileId(
                      populatedCommentUser.profileImagePath as string,
                    );
                }
              } else if (
                populatedCommentUser.role === 'seller' &&
                populatedCommentUser.storeLogoPath
              ) {
                if (populatedCommentUser.storeLogoPath.startsWith('http')) {
                  commentUserProfileImage = populatedCommentUser.storeLogoPath;
                } else {
                  commentUserProfileImage =
                    await this.awsS3Service.getImageByFileId(
                      populatedCommentUser.storeLogoPath as string,
                    );
                }
              }
            }

            const commentUserObj =
              typeof populatedCommentUser === 'string'
                ? { _id: populatedCommentUser, name: 'Unknown' }
                : populatedCommentUser &&
                    typeof populatedCommentUser.toObject === 'function'
                  ? populatedCommentUser.toObject()
                  : populatedCommentUser;

            return {
              ...comment.toObject(),
              user: {
                ...commentUserObj,
                profileImage: commentUserProfileImage,
              },
            };
          }),
        );

        return {
          ...forum.toObject(),
          image: imageUrl,
          user: {
            ...userObj,
            profileImage: userProfileImage,
          },
          comments: commentsWithProfileImages,
        };
      }),
    );

    return forumDataWithImages;
  }

  async addCommentForum(userId, forumId, addCommentDto: AddCommentDto) {
    if (!isValidObjectId(forumId))
      throw new BadRequestException('invalid mongo id');
    const forum = await this.forumModel.findById(forumId);
    if (!forum) throw new BadRequestException('forum not found');
    const updatedForum = await this.forumModel.findByIdAndUpdate(
      forumId,
      {
        $push: {
          comments: {
            user: userId,
            content: addCommentDto.content,
          },
        },
      },
      { new: true },
    );
    return updatedForum;
  }

  async addLikeForum(userId, forumId) {
    if (!isValidObjectId(forumId))
      throw new BadRequestException('invalid mongo id');
    const forum = await this.forumModel.findById(forumId);
    if (!forum) throw new BadRequestException('forum not found');

    if (forum.likesArray.includes(userId)) {
      throw new BadRequestException('User has already liked this post');
    }

    await this.forumModel.findByIdAndUpdate(forumId, {
      $push: { likesArray: userId },
      $inc: { likes: 1 },
    });

    return { message: 'forum liked' };
  }
  async removeLikeForum(userId, forumId) {
    if (!isValidObjectId(forumId))
      throw new BadRequestException('invalid mongo id');
    const forum = await this.forumModel.findById(forumId);
    if (!forum) throw new BadRequestException('forum not found');

    if (!forum.likesArray.includes(userId)) {
      throw new BadRequestException('User has not liked this post');
    }

    await this.forumModel.findByIdAndUpdate(forumId, {
      $pull: { likesArray: userId },
      $inc: { likes: -1 },
    });

    return { message: 'forum disliked' };
  }

  async findOne(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid forum ID');
    }

    const forum = await this.forumModel
      .findById(id)
      .populate('user', 'name _id role profileImagePath')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'name _id profileImagePath',
        },
      });

    if (!forum) {
      throw new NotFoundException('Forum post not found');
    }

    // Get forum post image
    const imageUrl = await this.awsS3Service.getImageByFileId(forum.imagePath);

    // Get user profile image
    let userProfileImage = null;
    const populatedUser = forum.user as any;

    if (populatedUser) {
      if (populatedUser.profileImagePath) {
        if (populatedUser.profileImagePath.startsWith('http')) {
          userProfileImage = populatedUser.profileImagePath;
        } else {
          userProfileImage = await this.awsS3Service.getImageByFileId(
            populatedUser.profileImagePath as string,
          );
        }
      } else if (
        populatedUser.role === 'seller' &&
        populatedUser.storeLogoPath
      ) {
        if (populatedUser.storeLogoPath.startsWith('http')) {
          userProfileImage = populatedUser.storeLogoPath;
        } else {
          userProfileImage = await this.awsS3Service.getImageByFileId(
            populatedUser.storeLogoPath as string,
          );
        }
      }
    }

    const userObj =
      typeof populatedUser === 'string'
        ? { _id: populatedUser, name: 'Unknown', role: 'user' }
        : populatedUser && typeof populatedUser.toObject === 'function'
          ? populatedUser.toObject()
          : populatedUser;

    // Get comment authors profile images
    const commentsWithProfileImages = await Promise.all(
      forum.comments.map(async (comment) => {
        let commentUserProfileImage = null;
        const populatedCommentUser = comment.user as any;

        if (populatedCommentUser) {
          if (populatedCommentUser.profileImagePath) {
            if (populatedCommentUser.profileImagePath.startsWith('http')) {
              commentUserProfileImage = populatedCommentUser.profileImagePath;
            } else {
              commentUserProfileImage =
                await this.awsS3Service.getImageByFileId(
                  populatedCommentUser.profileImagePath as string,
                );
            }
          } else if (
            populatedCommentUser.role === 'seller' &&
            populatedCommentUser.storeLogoPath
          ) {
            if (populatedCommentUser.storeLogoPath.startsWith('http')) {
              commentUserProfileImage = populatedCommentUser.storeLogoPath;
            } else {
              commentUserProfileImage =
                await this.awsS3Service.getImageByFileId(
                  populatedCommentUser.storeLogoPath as string,
                );
            }
          }
        }

        const commentUserObj =
          typeof populatedCommentUser === 'string'
            ? { _id: populatedCommentUser, name: 'Unknown' }
            : populatedCommentUser &&
                typeof populatedCommentUser.toObject === 'function'
              ? populatedCommentUser.toObject()
              : populatedCommentUser;

        return {
          ...comment.toObject(),
          user: {
            ...commentUserObj,
            profileImage: commentUserProfileImage,
          },
        };
      }),
    );

    return {
      ...forum.toObject(),
      image: imageUrl,
      user: {
        ...userObj,
        profileImage: userProfileImage,
      },
      comments: commentsWithProfileImages,
    };
  }

  async update(
    id: string,
    updateForumDto: UpdateForumDto,
    userId: string,
    userRole: string,
    filePath?: string,
    file?: Buffer,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid forum ID');
    }

    const forum = await this.forumModel.findById(id);
    if (!forum) {
      throw new NotFoundException('Forum not found');
    }

    const isAdmin = userRole === 'admin';
    const isOwner = forum.user.toString() === userId.toString();

    console.log('Update method values:', {
      forumUserId: forum.user.toString(),
      receivedUserId: userId,
      userRole,
      isAdmin,
      isOwner,
    });

    // Allow update if user is admin or is the post owner
    if (!isAdmin && !isOwner) {
      throw new UnauthorizedException('You can only edit your own posts');
    }

    let imagePath = forum.imagePath;
    if (filePath && file) {
      imagePath = await this.awsS3Service.uploadImage(filePath, file);
    }

    const updatedForum = await this.forumModel
      .findByIdAndUpdate(id, { ...updateForumDto, imagePath }, { new: true })
      .populate('user', 'name _id role');

    return updatedForum;
  }

  async remove(forumId, userId, userRole) {
    const forum = await this.forumModel.findById(forumId);
    if (!forum) throw new BadRequestException('forum not found');

    const isAdmin = userRole === 'admin';
    const isOwner = forum.user.toString() === userId.toString();

    console.log('Delete Post values:', {
      forumUserId: forum.user.toString(),
      receivedUserId: userId,
      userRole,
      isAdmin,
      isOwner,
    });

    // Allow deletion if user is admin or is the post owner
    if (!isAdmin && !isOwner) {
      throw new UnauthorizedException('You can only delete your own posts');
    }

    const deletedForum = await this.forumModel.findByIdAndDelete(forumId);
    const fileId = deletedForum.imagePath;
    if (fileId) {
      try {
        await this.awsS3Service.deleteImageByFileId(fileId);
      } catch (error) {
        throw new BadRequestException('Failed to delete the image from S3');
      }
    }

    return { message: 'Post successfully deleted' };
  }

  async replyToComment(userId: string, commentId: string, content: string) {
    if (!isValidObjectId(commentId)) {
      throw new BadRequestException('Invalid comment ID');
    }

    const parentComment = await this.commentModel.findById(commentId);
    if (!parentComment) {
      throw new BadRequestException('Comment not found');
    }

    const newReply = await this.commentModel.create({
      user: userId,
      content,
      parentComment: commentId,
    });

    // შვილობილი კომენტარის ბმული მშობელთან
    await this.commentModel.findByIdAndUpdate(commentId, {
      $push: { replies: newReply._id },
    });

    return newReply;
  }

  async addReplyToComment(
    forumId: string,
    commentId: string,
    userId: string,
    content: string,
  ) {
    if (!isValidObjectId(forumId) || !isValidObjectId(commentId)) {
      throw new BadRequestException('Invalid ID format');
    }

    const forum = await this.forumModel.findById(forumId);
    if (!forum) {
      throw new NotFoundException('Forum not found');
    }

    const newComment = await this.commentModel.create({
      user: new Types.ObjectId(userId),
      content,
      parentId: new Types.ObjectId(commentId),
      replies: [],
    });

    // ვამატებთ ახალ კომენტარს ფორუმში
    await this.forumModel.findByIdAndUpdate(
      forumId,
      {
        $push: { comments: newComment },
      },
      { new: true },
    );

    // ვამატებთ reply-ს მშობელ კომენტარში
    await this.forumModel.updateOne(
      {
        _id: forumId,
        'comments._id': commentId,
      },
      {
        $push: { 'comments.$.replies': newComment._id },
      },
    );

    return this.forumModel.findById(forumId).populate({
      path: 'comments.user',
      select: 'name _id',
    });
  }

  async deleteComment(
    forumId: string,
    commentId: string,
    userId: string,
    isAdmin: boolean,
  ) {
    const forum = await this.forumModel.findById(forumId);
    if (!forum) {
      throw new NotFoundException('Forum not found');
    }

    const commentIndex = forum.comments.findIndex(
      (comment) => comment._id.toString() === commentId,
    );

    if (commentIndex === -1) {
      throw new NotFoundException('Comment not found');
    }

    const comment = forum.comments[commentIndex];

    console.log('Delete Comment values:', {
      commentUserId: comment.user.toString(),
      receivedUserId: userId,
      isAdmin,
      isMatch: comment.user.toString() === userId.toString(),
    });

    if (!isAdmin && comment.user.toString() !== userId.toString()) {
      throw new UnauthorizedException('You can only delete your own comments');
    }

    // რეკურსიულად წავშალოთ ყველა reply
    const deleteReplies = (commentId: string) => {
      forum.comments = forum.comments.filter((comment) => {
        if (comment.parentId?.toString() === commentId) {
          deleteReplies(comment._id.toString());
          return false;
        }
        return true;
      });
    };

    deleteReplies(comment._id.toString());
    forum.comments.splice(commentIndex, 1);

    await forum.save();

    return this.forumModel.findById(forumId).populate({
      path: 'comments.user',
      select: 'name _id',
    });
  }

  async editComment(
    forumId: string,
    commentId: string,
    userId: string,
    content: string,
    isAdmin: boolean,
  ) {
    const forum = await this.forumModel.findById(forumId);
    if (!forum) {
      throw new NotFoundException('Forum not found');
    }

    const comment = forum.comments.find(
      (comment) => comment._id.toString() === commentId,
    );

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    console.log('Edit Comment values:', {
      commentUserId: comment.user.toString(),
      receivedUserId: userId,
      isAdmin,
      isMatch: comment.user.toString() === userId.toString(),
    });

    if (!isAdmin && comment.user.toString() !== userId.toString()) {
      throw new UnauthorizedException('You can only edit your own comments');
    }

    comment.content = content;

    await forum.save();

    return this.forumModel.findById(forumId).populate({
      path: 'comments.user',
      select: 'name _id',
    });
  }

  async addCommentLike(forumId: string, commentId: string, userId: string) {
    if (!isValidObjectId(forumId) || !isValidObjectId(commentId)) {
      throw new BadRequestException('Invalid ID format');
    }

    const forum = await this.forumModel.findById(forumId);
    if (!forum) {
      throw new NotFoundException('Forum not found');
    }

    const commentIndex = forum.comments.findIndex(
      (c) => c._id.toString() === commentId,
    );

    if (commentIndex === -1) {
      throw new NotFoundException('Comment not found');
    }

    const comment = forum.comments[commentIndex];

    // Initialize likesArray if it doesn't exist
    if (!comment.likesArray) {
      comment.likesArray = [];
    }

    // Convert likesArray elements to strings for comparison
    const userIdStr = userId.toString();
    const alreadyLiked = comment.likesArray.some(
      (id) => id.toString() === userIdStr,
    );

    // Check if user already liked this comment
    if (alreadyLiked) {
      throw new BadRequestException('User already liked this comment');
    }

    // Add like
    comment.likesArray.push(userId as any);
    comment.likes = comment.likesArray.length;

    await forum.save();

    return {
      message: 'Comment liked successfully',
      likes: comment.likes,
    };
  }

  async removeCommentLike(forumId: string, commentId: string, userId: string) {
    if (!isValidObjectId(forumId) || !isValidObjectId(commentId)) {
      throw new BadRequestException('Invalid ID format');
    }

    const forum = await this.forumModel.findById(forumId);
    if (!forum) {
      throw new NotFoundException('Forum not found');
    }

    const commentIndex = forum.comments.findIndex(
      (c) => c._id.toString() === commentId,
    );

    if (commentIndex === -1) {
      throw new NotFoundException('Comment not found');
    }

    const comment = forum.comments[commentIndex];

    // Initialize likesArray if it doesn't exist
    if (!comment.likesArray) {
      comment.likesArray = [];
      throw new BadRequestException('User has not liked this comment');
    }

    // Convert user ID to string for comparison
    const userIdStr = userId.toString();
    const hasLiked = comment.likesArray.some(
      (id) => id.toString() === userIdStr,
    );

    // Check if user has liked this comment
    if (!hasLiked) {
      throw new BadRequestException('User has not liked this comment');
    }

    // Remove like
    comment.likesArray = comment.likesArray.filter(
      (id) => id.toString() !== userIdStr,
    );
    comment.likes = comment.likesArray.length;

    await forum.save();

    return {
      message: 'Comment like removed successfully',
      likes: comment.likes,
    };
  }
}
