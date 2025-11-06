import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BlogPostDocument = BlogPost & Document;

export enum PostType {
  INTERVIEW = 'interview',
  ARTICLE = 'article',
}

@Schema({ timestamps: true })
export class BlogPost {
  @Prop({ required: true, enum: PostType, default: PostType.INTERVIEW })
  postType: PostType;

  @Prop({ required: true })
  title: string;

  @Prop()
  titleEn: string;

  // For interviews
  @Prop()
  artist: string;

  @Prop()
  artistEn: string;

  @Prop()
  artistUsername?: string; // For interviews: artist username, For articles: any URL link

  @Prop()
  linkName?: string;

  @Prop()
  linkNameEn?: string;

  @Prop({ required: true })
  coverImage: string;

  // For interviews
  @Prop()
  intro: string;

  @Prop()
  introEn: string;

  @Prop({ type: [{ question: String, answer: String }] })
  qa: Array<{ question: string; answer: string }>;

  @Prop({ type: [{ question: String, answer: String }] })
  qaEn: Array<{ question: string; answer: string }>;

  // For articles
  @Prop()
  subtitle: string;

  @Prop()
  subtitleEn: string;

  @Prop()
  content: string;

  @Prop()
  contentEn: string;

  @Prop()
  author: string;

  @Prop()
  authorEn: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ type: Date, default: Date.now })
  publishDate: Date;

  @Prop({ type: Number, default: 0 })
  views: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPost);
