import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BlogPost } from './blog-post.schema';

export type BlogPostViewDocument = BlogPostView & Document;

@Schema({ timestamps: true })
export class BlogPostView {
  @Prop({
    type: Types.ObjectId,
    ref: BlogPost.name,
    required: true,
    index: true,
  })
  post: Types.ObjectId;

  @Prop({ required: true })
  ipAddress: string;
}

export const BlogPostViewSchema = SchemaFactory.createForClass(BlogPostView);
BlogPostViewSchema.index({ post: 1, ipAddress: 1 }, { unique: true });
