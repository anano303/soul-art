import { IsString, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class CreateBannerDto {
  @IsString()
  title: string;

  @IsString()
  titleEn: string;

  @IsString()
  buttonText: string;

  @IsString()
  buttonTextEn: string;

  @IsString()
  buttonLink: string;

  @IsString()
  imageUrl: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  // Allow images field for file upload (will be handled by interceptor)
  @IsOptional()
  images?: any;
}

export class UpdateBannerDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  titleEn?: string;

  @IsString()
  @IsOptional()
  buttonText?: string;

  @IsString()
  @IsOptional()
  buttonTextEn?: string;

  @IsString()
  @IsOptional()
  buttonLink?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  // Allow images field for file upload (will be handled by interceptor)
  @IsOptional()
  images?: any;
}
