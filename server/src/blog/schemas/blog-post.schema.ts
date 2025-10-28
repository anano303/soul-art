import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BlogPostDocument = BlogPost & Document;

@Schema({ timestamps: true })
export class BlogPost {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  titleEn: string;

  @Prop({ required: true })
  artist: string;

  @Prop({ required: true })
  artistEn: string;

  @Prop()
  artistUsername?: string;

  @Prop({ required: true })
  coverImage: string;

  @Prop({ required: true })
  intro: string;

  @Prop({ required: true })
  introEn: string;

  @Prop({ type: [{ question: String, answer: String }], required: true })
  qa: Array<{ question: string; answer: string }>;

  @Prop({ type: [{ question: String, answer: String }], required: true })
  qaEn: Array<{ question: string; answer: string }>;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ type: Date, default: Date.now })
  publishDate: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPost);
