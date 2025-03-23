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
// import { AddReplyDto } from './dto/addReply.dto';

@Controller('forums')
export class ForumsController {
  constructor(private readonly forumsService: ForumsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  create(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
    @Body() createForumDto: CreateForumDto,
  ) {
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (!file) return this.forumsService.create(createForumDto, user._id);

    const timestamp = Date.now();
    const filePath = `images/${timestamp}`;
    const filesSizeInMb = Number((file.size / (1024 * 1024)).toFixed(1));

    if (filesSizeInMb > 5) {
      throw new BadRequestException('The file must be less than 5 MB.');
    }

    return this.forumsService.create(
      createForumDto,
      user._id,
      filePath,
      file.buffer,
    );
  }

  @Get()
  findAll(@Query() queryParams: queryParamsDto) {
    return this.forumsService.findAll(queryParams);
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
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateForumDto: UpdateForumDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const timestamp = Date.now();
    const filePath = file ? `images/${timestamp}` : undefined;
    const fileBuffer = file ? file.buffer : undefined;

    return this.forumsService.update(id, updateForumDto, user._id, filePath, fileBuffer);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.forumsService.remove(id, user._id);
  }
}
