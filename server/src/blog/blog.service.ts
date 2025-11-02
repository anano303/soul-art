import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlogPost, BlogPostDocument } from './schemas/blog-post.schema';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { Role } from '../types/role.enum';

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(BlogPost.name)
    private blogPostModel: Model<BlogPostDocument>,
  ) {}

  async create(
    createBlogPostDto: CreateBlogPostDto,
    userId: string,
    userRole: Role,
  ): Promise<BlogPost> {
    const isAdmin = userRole === Role.Admin;
    const publishDate = createBlogPostDto.publishDate
      ? new Date(createBlogPostDto.publishDate)
      : new Date();

    const payload: CreateBlogPostDto = {
      ...createBlogPostDto,
      isPublished: isAdmin ? (createBlogPostDto.isPublished ?? false) : false,
      publishDate: publishDate.toISOString(),
    };

    const blogPost = new this.blogPostModel({
      ...payload,
      createdBy: userId,
    });
    return blogPost.save();
  }

  async findAll(published?: boolean): Promise<BlogPost[]> {
    const filter = published !== undefined ? { isPublished: published } : {};
    return this.blogPostModel
      .find(filter)
      .sort({ publishDate: -1 })
      .populate('createdBy', 'name username email')
      .exec();
  }

  async findOne(id: string): Promise<BlogPost> {
    const blogPost = await this.blogPostModel
      .findById(id)
      .populate('createdBy', 'name username email')
      .exec();

    if (!blogPost) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }

    return blogPost;
  }

  async update(
    id: string,
    updateBlogPostDto: UpdateBlogPostDto,
    userId: string,
    userRole: Role,
  ): Promise<BlogPost> {
    const existing = await this.blogPostModel.findById(id).exec();

    if (!existing) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }

    const isAdmin = userRole === Role.Admin;
    const isOwner = existing.createdBy?.toString() === userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You can only modify your own posts');
    }

    const sanitizedUpdate: UpdateBlogPostDto = {
      ...updateBlogPostDto,
    };

    delete (sanitizedUpdate as any).createdBy;
    delete (sanitizedUpdate as any).createdById;

    if (!isAdmin) {
      sanitizedUpdate.isPublished = existing.isPublished;
    }

    Object.assign(existing, sanitizedUpdate);
    await existing.save();

    return existing;
  }

  async remove(id: string): Promise<void> {
    const result = await this.blogPostModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }
  }

  async togglePublish(id: string): Promise<BlogPost> {
    const blogPost = await this.findOne(id);
    blogPost.isPublished = !blogPost.isPublished;
    return this.blogPostModel
      .findByIdAndUpdate(
        id,
        { isPublished: blogPost.isPublished },
        { new: true },
      )
      .exec();
  }

  async incrementView(id: string): Promise<BlogPost> {
    const blogPost = await this.blogPostModel
      .findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })
      .populate('createdBy', 'name username email')
      .exec();

    if (!blogPost) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }

    return blogPost;
  }
}
