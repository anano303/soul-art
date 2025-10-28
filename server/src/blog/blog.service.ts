import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlogPost, BlogPostDocument } from './schemas/blog-post.schema';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(BlogPost.name)
    private blogPostModel: Model<BlogPostDocument>,
  ) {}

  async create(
    createBlogPostDto: CreateBlogPostDto,
    userId: string,
  ): Promise<BlogPost> {
    const blogPost = new this.blogPostModel({
      ...createBlogPostDto,
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
  ): Promise<BlogPost> {
    const blogPost = await this.blogPostModel
      .findByIdAndUpdate(id, updateBlogPostDto, { new: true })
      .exec();

    if (!blogPost) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }

    return blogPost;
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
}
