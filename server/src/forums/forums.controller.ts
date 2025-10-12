import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ForumsService } from './forums.service';
import { CreateForumDto } from './dto/create-forum.dto';
import { UpdateForumDto } from './dto/update-forum.dto';
import { queryParamsDto } from './dto/queryParams.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { AddCommentDto } from './dto/addComment.dto';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { User } from '@/types';
import { AddReplyDto } from './dto/addReply.dto';
import { SearchForumDto } from './dto/search-forum.dto';
import { uploadRateLimit } from '@/middleware/security.middleware';
import { createRateLimitInterceptor } from '@/interceptors/rate-limit.interceptor';
import { PushNotificationService } from '@/push/services/push-notification.service';
// import { AddReplyDto } from './dto/addReply.dto';

@Controller('forums')
export class ForumsController {
  constructor(
    private readonly forumsService: ForumsService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @UseInterceptors(createRateLimitInterceptor(uploadRateLimit))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
    @Body() createForumDto: CreateForumDto,
  ) {
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!file) {
      const createdForum = await this.forumsService.create(
        createForumDto,
        user._id,
      );

      // Send push notification for new forum post (don't await to avoid blocking response)
      this.sendNewForumPostPushNotification(createdForum, user).catch(
        (error) => {
          console.error(
            'Failed to send push notification for new forum post:',
            error,
          );
        },
      );

      return createdForum;
    }

    console.log('Received file:', {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    });

    // Check file type more permissively
    const validMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image.heic',
      'image.heif',
    ];

    if (
      !validMimeTypes.includes(file.mimetype.toLowerCase()) &&
      !file.mimetype.toLowerCase().startsWith('image/')
    ) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Supported types: JPEG, PNG, GIF, WEBP, HEIC.`,
      );
    }

    const timestamp = Date.now();
    const filePath = `images/${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filesSizeInMb = Number((file.size / (1024 * 1024)).toFixed(1));

    if (filesSizeInMb > 5) {
      throw new BadRequestException('The file must be less than 5 MB.');
    }

    return this.forumsService
      .create(
        createForumDto,
        user._id,
        filePath,
        file, // Pass the entire file object, not just buffer
      )
      .then((createdForum) => {
        // Send push notification for new forum post (don't await to avoid blocking response)
        this.sendNewForumPostPushNotification(createdForum, user).catch(
          (error) => {
            console.error(
              'Failed to send push notification for new forum post:',
              error,
            );
          },
        );
        return createdForum;
      });
  }

  @Get()
  findAll(@Query() queryParams: queryParamsDto) {
    return this.forumsService.findAll(queryParams);
  }

  @Get('search')
  searchForums(@Query() searchParams: SearchForumDto) {
    return this.forumsService.searchForums(searchParams);
  }

  @Post('add-comment')
  @UseGuards(JwtAuthGuard)
  addCommentForum(
    @CurrentUser() user: User,
    @Body() addCommentDto: AddCommentDto,
    @Req() req: Request,
  ) {
    const forumId = req.headers['forum-id'] as string;
    if (!forumId) throw new BadRequestException('Forum ID is required');
    return this.forumsService.addCommentForum(user._id, forumId, addCommentDto);
  }

  @Post('add-like')
  @UseGuards(JwtAuthGuard)
  addLikeForum(@CurrentUser() user: User, @Req() req: Request) {
    const forumId = req.headers['forum-id'] as string;
    if (!forumId) throw new BadRequestException('Forum ID is required');
    return this.forumsService.addLikeForum(user._id, forumId);
  }

  @Post('remove-like')
  @UseGuards(JwtAuthGuard)
  removeLikeForum(@CurrentUser() user: User, @Req() req: Request) {
    const forumId = req.headers['forum-id'] as string;
    if (!forumId) throw new BadRequestException('Forum ID is required');
    return this.forumsService.removeLikeForum(user._id, forumId);
  }

  @Post('add-reply')
  @UseGuards(JwtAuthGuard)
  async addReply(
    @CurrentUser() user: User,
    @Body() addReplyDto: AddReplyDto,
    @Req() req: Request,
  ) {
    const forumId = req.headers['forum-id'] as string;
    if (!forumId) throw new BadRequestException('Forum ID is required');
    return this.forumsService.addReplyToComment(
      forumId,
      addReplyDto.commentId,
      user._id,
      addReplyDto.content,
    );
  }

  @Post('add-comment-like')
  @UseGuards(JwtAuthGuard)
  async addCommentLike(
    @CurrentUser() user: User,
    @Body() body: { commentId: string },
    @Req() req: Request,
  ) {
    const forumId = req.headers['forum-id'] as string;

    if (!forumId) throw new BadRequestException('Forum ID is required');
    if (!body.commentId)
      throw new BadRequestException('Comment ID is required');

    return this.forumsService.addCommentLike(
      forumId,
      body.commentId, // Get commentId from body
      user._id,
    );
  }

  @Post('remove-comment-like')
  @UseGuards(JwtAuthGuard)
  async removeCommentLike(
    @CurrentUser() user: User,
    @Body() body: { commentId: string },
    @Req() req: Request,
  ) {
    const forumId = req.headers['forum-id'] as string;

    if (!forumId) throw new BadRequestException('Forum ID is required');
    if (!body.commentId)
      throw new BadRequestException('Comment ID is required');

    return this.forumsService.removeCommentLike(
      forumId,
      body.commentId, // Get commentId from body
      user._id,
    );
  }

  @Delete('delete-comment/:commentId')
  @UseGuards(JwtAuthGuard)
  async deleteComment(
    @CurrentUser() user: User,
    @Param('commentId') commentId: string,
    @Req() req: Request,
  ) {
    const forumId = req.headers['forum-id'] as string;
    if (!forumId) throw new BadRequestException('Forum ID is required');
    return this.forumsService.deleteComment(
      forumId,
      commentId,
      user._id,
      user.role === 'admin',
    );
  }

  @Put('edit-comment/:commentId')
  @UseGuards(JwtAuthGuard)
  async editComment(
    @CurrentUser() user: User,
    @Param('commentId') commentId: string,
    @Body() editCommentDto: { content: string },
    @Req() req: Request,
  ) {
    const forumId = req.headers['forum-id'] as string;
    if (!forumId) throw new BadRequestException('Forum ID is required');
    return this.forumsService.editComment(
      forumId,
      commentId,
      user._id,
      editCommentDto.content,
      user.role === 'admin',
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.forumsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @UseInterceptors(createRateLimitInterceptor(uploadRateLimit))
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateForumDto: any, // Temporarily disable strict typing
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!user) {
      throw new BadRequestException('User authentication required');
    }

    // Manually parse FormData
    const parsedDto: any = {};
    if (updateForumDto.content) {
      parsedDto.content = updateForumDto.content;
    }
    if (updateForumDto.tags && Array.isArray(updateForumDto.tags)) {
      parsedDto.tags = updateForumDto.tags;
    }

    console.log('Parsed updateForumDto:', parsedDto);

    // Pass user role to the service
    if (!file) {
      return this.forumsService.update(id, parsedDto, user._id, user.role);
    }

    console.log('Update request from:', {
      userId: user._id,
      userName: user.name,
      userRole: user.role,
    });

    // Check file type more permissively
    const validMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image.heic',
      'image.heif',
    ];

    if (
      !validMimeTypes.includes(file.mimetype.toLowerCase()) &&
      !file.mimetype.toLowerCase().startsWith('image/')
    ) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Supported types: JPEG, PNG, GIF, WEBP, HEIC.`,
      );
    }

    const timestamp = Date.now();
    const filePath = `images/${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    return this.forumsService.update(
      id,
      parsedDto,
      user._id,
      user.role,
      filePath,
      file, // Pass the entire file object, not just buffer
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    if (!user) {
      throw new BadRequestException('User authentication required');
    }

    console.log('Delete request from:', {
      userId: user._id,
      userName: user.name,
      userRole: user.role,
    });

    // Pass user role to the service
    return this.forumsService.remove(id, user._id, user.role);
  }

  // Private method to send push notification for new forum post
  private async sendNewForumPostPushNotification(forum: any, user: any) {
    try {
      const pushPayload = {
        title: '💬 ახალი პოსტი ფორუმზე!',
        body: `${user.name || 'ადმინისტრატორი'} დაამატა ახალი პოსტი: ${forum.title || 'უსათაურო პოსტი'}`,
        icon: forum.imagePath || '/android-icon-192x192.png',
        badge: '/favicon-96x96.png',
        data: {
          type: 'new_forum_post' as const,
          url: `/forum/${forum._id}`,
          id: forum._id,
        },
        tag: `new-forum-post-${forum._id}`,
        requireInteraction: true,
      };

      console.log(
        '📤 Sending push notification for new forum post:',
        forum.title || 'უსათაურო პოსტი',
      );

      // Send push notification to all subscribers using the service
      const results = await this.pushNotificationService.sendToAll(pushPayload);

      console.log('✅ Push notification sent successfully:', {
        sent: results.successful,
        failed: results.failed,
      });
    } catch (error) {
      console.error('❌ Failed to send push notification:', error.message);
      // Don't throw error - push notification failure shouldn't break forum post creation
    }
  }
}
