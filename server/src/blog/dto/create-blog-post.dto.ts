import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsBoolean,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class QAItem {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  answer: string;
}

export class CreateBlogPostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  titleEn: string;

  @IsString()
  @IsNotEmpty()
  artist: string;

  @IsString()
  @IsNotEmpty()
  artistEn: string;

  @IsString()
  @IsOptional()
  artistUsername?: string;

  @IsString()
  @IsNotEmpty()
  coverImage: string;

  @IsString()
  @IsNotEmpty()
  intro: string;

  @IsString()
  @IsNotEmpty()
  introEn: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QAItem)
  qa: QAItem[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QAItem)
  qaEn: QAItem[];

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
