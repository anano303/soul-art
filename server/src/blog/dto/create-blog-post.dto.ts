import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsBoolean,
  IsDateString,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostType } from '../schemas/blog-post.schema';

class QAItem {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  answer: string;
}

export class CreateBlogPostDto {
  @IsEnum(PostType)
  @IsOptional()
  postType?: PostType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  titleEn?: string;

  // For interviews
  @IsString()
  @IsOptional()
  artist?: string;

  @IsString()
  @IsOptional()
  artistEn?: string;

  @IsString()
  @IsOptional()
  artistUsername?: string;

  @IsString()
  @IsNotEmpty()
  coverImage: string;

  // For interviews
  @IsString()
  @IsOptional()
  intro?: string;

  @IsString()
  @IsOptional()
  introEn?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QAItem)
  @IsOptional()
  qa?: QAItem[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QAItem)
  @IsOptional()
  qaEn?: QAItem[];

  // For articles
  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  subtitleEn?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  contentEn?: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  authorEn?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsDateString()
  @IsOptional()
  publishDate?: string;
}
