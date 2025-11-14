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
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { UserDocument } from '../schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PortfolioPost,
  PortfolioPostDocument,
} from '../schemas/portfolio-post.schema';
import {
  CreatePortfolioPostDto,
  UpdatePortfolioPostDto,
} from '../dtos/portfolio-post.dto';
import { Role } from '@/types/role.enum';

@Controller('portfolio')
export class PortfolioController {
  constructor(
    @InjectModel(PortfolioPost.name)
    private portfolioPostModel: Model<PortfolioPostDocument>,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPost(
    @CurrentUser() user: UserDocument,
    @Body() createDto: CreatePortfolioPostDto,
  ) {
    // Only sellers can create portfolio posts
    if (user.role !== Role.Seller) {
      throw new ForbiddenException('Only sellers can create portfolio posts');
    }

    // Validate images array
    if (!createDto.images || createDto.images.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    // Check for product-backed post if productId is provided
    if (createDto.productId) {
      const existing = await this.portfolioPostModel.findOne({
        productId: new Types.ObjectId(createDto.productId),
      });

      if (existing) {
        throw new BadRequestException(
          'A portfolio post already exists for this product',
        );
      }
    }

    const images = createDto.images.map((url, index) => ({
      url,
      order: index,
      metadata: {
        source: 'manual-upload',
      },
    }));

    const post = await this.portfolioPostModel.create({
      artistId: user._id,
      productId: createDto.productId
        ? new Types.ObjectId(createDto.productId)
        : null,
      images,
      caption: createDto.caption || null,
      tags: createDto.tags || [],
      isFeatured: createDto.isFeatured || false,
      isSold: createDto.isSold || false,
      hideBuyButton: createDto.hideBuyButton || false,
      likesCount: 0,
      commentsCount: 0,
      publishedAt: new Date(),
    });

    return post;
  }

  @Get('artist/:artistId')
  async getArtistPosts(
    @Param('artistId') artistId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('featured') featured?: string,
  ) {
    if (!Types.ObjectId.isValid(artistId)) {
      throw new BadRequestException('Invalid artist ID');
    }

    const filter: any = {
      artistId: new Types.ObjectId(artistId),
      archivedAt: null,
    };

    if (featured === 'true') {
      filter.isFeatured = true;
    }

    const limitNum = parseInt(limit || '60', 10);
    const skipNum = parseInt(skip || '0', 10);

    const [posts, total] = await Promise.all([
      this.portfolioPostModel
        .find(filter)
        .populate({
          path: 'productId',
          select: 'status countInStock variants',
        })
        .sort({ isFeatured: -1, updatedAt: -1, publishedAt: -1, createdAt: -1, _id: -1 })
        .limit(limitNum)
        .skip(skipNum)
        .lean(),
      this.portfolioPostModel.countDocuments(filter),
    ]);

    return {
      posts,
      total,
      hasMore: skipNum + posts.length < total,
    };
  }

  @Get(':id')
  async getPost(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.portfolioPostModel.findById(id).populate('productId').lean();

    if (!post) {
      throw new NotFoundException('Portfolio post not found');
    }

    return post;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updatePost(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() updateDto: UpdatePortfolioPostDto,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.portfolioPostModel.findById(id);

    if (!post) {
      throw new NotFoundException('Portfolio post not found');
    }

    // Check ownership
    if (post.artistId.toString() !== user._id.toString()) {
      throw new ForbiddenException('You can only update your own posts');
    }

    const updateFields: any = {};

    if (updateDto.images) {
      if (updateDto.images.length === 0) {
        throw new BadRequestException('At least one image is required');
      }
      updateFields.images = updateDto.images.map((url, index) => ({
        url,
        order: index,
        metadata: {
          source: 'manual-update',
        },
      }));
    }

    if (updateDto.caption !== undefined) {
      updateFields.caption = updateDto.caption || null;
    }

    if (updateDto.tags !== undefined) {
      updateFields.tags = updateDto.tags || [];
    }

    if (updateDto.isFeatured !== undefined) {
      updateFields.isFeatured = updateDto.isFeatured;
    }

    if (updateDto.isSold !== undefined) {
      updateFields.isSold = updateDto.isSold;
    }

    if (updateDto.hideBuyButton !== undefined) {
      updateFields.hideBuyButton = updateDto.hideBuyButton;
    }

    const updatedPost = await this.portfolioPostModel.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true },
    );

    return updatedPost;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.portfolioPostModel.findById(id);

    if (!post) {
      throw new NotFoundException('Portfolio post not found');
    }

    // Check ownership
    if (post.artistId.toString() !== user._id.toString()) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Allow deletion of all portfolio posts including product-backed ones
    // The product itself will remain, only the portfolio post is deleted
    await this.portfolioPostModel.findByIdAndDelete(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getMyPosts(
    @CurrentUser() user: UserDocument,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const limitNum = parseInt(limit || '60', 10);
    const skipNum = parseInt(skip || '0', 10);

    const filter: any = {
      artistId: user._id,
      archivedAt: null,
    };

    const [posts, total] = await Promise.all([
      this.portfolioPostModel
        .find(filter)
        .populate({
          path: 'productId',
          select: 'status countInStock variants',
        })
        .sort({ isFeatured: -1, updatedAt: -1, publishedAt: -1, createdAt: -1, _id: -1 })
        .limit(limitNum)
        .skip(skipNum)
        .lean(),
      this.portfolioPostModel.countDocuments(filter),
    ]);

    return {
      posts,
      total,
      hasMore: skipNum + posts.length < total,
    };
  }

  @Put(':id/toggle-featured')
  @UseGuards(JwtAuthGuard)
  async toggleFeatured(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.portfolioPostModel.findById(id);

    if (!post) {
      throw new NotFoundException('Portfolio post not found');
    }

    // Check ownership
    if (post.artistId.toString() !== user._id.toString()) {
      throw new ForbiddenException('You can only modify your own posts');
    }

    post.isFeatured = !post.isFeatured;
    await post.save();

    return post;
  }
}
