import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlogPost, BlogPostDocument } from './schemas/blog-post.schema';
import {
  BlogPostView,
  BlogPostViewDocument,
} from './schemas/blog-post-view.schema';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { Role } from '../types/role.enum';

@Injectable()
export class BlogService {
  private readonly MIN_DISPLAY_VIEWS = 220;

  constructor(
    @InjectModel(BlogPost.name)
    private blogPostModel: Model<BlogPostDocument>,
    @InjectModel(BlogPostView.name)
    private blogPostViewModel: Model<BlogPostViewDocument>,
  ) {}

  private normalizeIp(ip?: string | string[]): string | null {
    if (!ip) {
      return null;
    }

    const raw = Array.isArray(ip) ? ip[0] : ip;

    if (!raw) {
      return null;
    }

    return raw.replace('::ffff:', '').trim().toLowerCase();
  }

  private formatPost(
    post: BlogPostDocument | (BlogPost & Record<string, any>) | null,
  ) {
    if (!post) {
      return post;
    }

    const plain =
      typeof (post as BlogPostDocument).toObject === 'function'
        ? (post as BlogPostDocument).toObject({ virtuals: true })
        : (post as BlogPost & Record<string, any>);

    return {
      ...plain,
      views: this.MIN_DISPLAY_VIEWS + Math.max(plain.views ?? 0, 0),
    };
  }

  async create(
    createBlogPostDto: CreateBlogPostDto,
    userId: string,
    userRole: Role,
  ) {
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
    await blogPost.save();
    await blogPost.populate('createdBy', 'name username email');
    return this.formatPost(blogPost);
  }

  async findAll(published?: boolean) {
    const filter = published !== undefined ? { isPublished: published } : {};
    const posts = await this.blogPostModel
      .find(filter)
      .sort({ publishDate: -1 })
      .populate('createdBy', 'name username email')
      .lean({ virtuals: true })
      .exec();

    return posts.map((post) => this.formatPost(post));
  }

  async findOne(id: string) {
    const blogPost = await this.blogPostModel
      .findById(id)
      .populate('createdBy', 'name username email')
      .lean({ virtuals: true })
      .exec();

    if (!blogPost) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }

    return this.formatPost(blogPost);
  }

  async update(
    id: string,
    updateBlogPostDto: UpdateBlogPostDto,
    userId: string,
    userRole: Role,
  ) {
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
    await existing.populate('createdBy', 'name username email');

    return this.formatPost(existing);
  }

  async remove(id: string): Promise<void> {
    const result = await this.blogPostModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }
  }

  async togglePublish(id: string) {
    const blogPost = await this.findOne(id);
    const updated = await this.blogPostModel
      .findByIdAndUpdate(
        id,
        { isPublished: !blogPost.isPublished },
        { new: true },
      )
      .populate('createdBy', 'name username email')
      .exec();

    if (!updated) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }

    return this.formatPost(updated);
  }

  async incrementView(id: string, ipAddress?: string) {
    const normalizedIp = this.normalizeIp(ipAddress);
    let shouldIncrement = true;

    if (normalizedIp) {
      const updateResult = await this.blogPostViewModel
        .updateOne(
          { post: id, ipAddress: normalizedIp },
          { $setOnInsert: { post: id, ipAddress: normalizedIp } },
          { upsert: true },
        )
        .exec();

      const upsertedCount = (updateResult as any)?.upsertedCount ?? 0;
      shouldIncrement = upsertedCount > 0;
    }

    const query = shouldIncrement
      ? this.blogPostModel.findByIdAndUpdate(
          id,
          { $inc: { views: 1 } },
          { new: true },
        )
      : this.blogPostModel.findById(id);

    const blogPost = await query
      .populate('createdBy', 'name username email')
      .exec();

    if (!blogPost) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }

    return this.formatPost(blogPost);
  }
}
