import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../types/role.enum';
import { UserId } from '../decorators/userId.decorator';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // Public: Get all published blog posts
  @Get()
  async findAll(@Query('published') published?: string) {
    const isPublished =
      published === 'true' ? true : published === 'false' ? false : undefined;
    return this.blogService.findAll(isPublished);
  }

  // Public: Get single blog post
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.blogService.findOne(id);
  }

  // Admin only: Create blog post
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async create(
    @Body() createBlogPostDto: CreateBlogPostDto,
    @UserId() userId: string,
  ) {
    return this.blogService.create(createBlogPostDto, userId);
  }

  // Admin only: Update blog post
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async update(
    @Param('id') id: string,
    @Body() updateBlogPostDto: UpdateBlogPostDto,
  ) {
    return this.blogService.update(id, updateBlogPostDto);
  }

  // Admin only: Delete blog post
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async remove(@Param('id') id: string) {
    await this.blogService.remove(id);
    return { message: 'Blog post deleted successfully' };
  }

  // Admin only: Toggle publish status
  @Put(':id/toggle-publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async togglePublish(@Param('id') id: string) {
    return this.blogService.togglePublish(id);
  }
}
