import {
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  IsMongoId,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

export class CreatePortfolioPostDto {
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  caption?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(20)
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsBoolean()
  @IsOptional()
  isSold?: boolean;

  @IsBoolean()
  @IsOptional()
  hideBuyButton?: boolean;

  @IsMongoId()
  @IsOptional()
  productId?: string;
}

export class UpdatePortfolioPostDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  caption?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(20)
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsBoolean()
  @IsOptional()
  isSold?: boolean;

  @IsBoolean()
  @IsOptional()
  hideBuyButton?: boolean;
}
