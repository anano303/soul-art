import {
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  IsOptional,
  IsObject,
  ValidateNested,
  IsMongoId,
  IsBoolean,
} from 'class-validator';
import {
  ProductStatus,
  DeliveryType,
  MainCategory,
  AgeGroup,
} from '../schemas/product.schema';
import { Type } from 'class-transformer';

class CategoryStructureDto {
  @IsEnum(MainCategory)
  main: MainCategory;

  @IsString()
  sub: string;

  @IsString()
  @IsOptional()
  subEn?: string;

  @IsEnum(AgeGroup)
  @IsOptional()
  ageGroup?: AgeGroup;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  colorEn?: string;
}

class ProductVariantDto {
  @IsString()
  size: string;

  @IsString()
  color: string;

  @IsString()
  @IsOptional()
  colorEn?: string;

  @IsNumber()
  stock: number;

  @IsString()
  @IsOptional()
  sku?: string;
}

export class ProductDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsNumber()
  price!: number;

  // Discount functionality
  @IsNumber()
  @IsOptional()
  discountPercentage?: number;

  @IsOptional()
  discountStartDate?: Date;

  @IsOptional()
  discountEndDate?: Date;

  @IsString()
  description!: string;

  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @IsString()
  @IsOptional()
  videoDescription?: string; // YouTube embed code or URL

  @IsString()
  @IsOptional()
  youtubeVideoId?: string;

  @IsString()
  @IsOptional()
  youtubeVideoUrl?: string;

  @IsString()
  @IsOptional()
  youtubeEmbedUrl?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  hashtags?: string[];

  @IsArray()
  @IsString({ each: true })
  images!: string[];

  @IsString()
  brand?: string;

  // Legacy category field - kept for backward compatibility
  @IsString()
  @IsOptional()
  category?: string;

  // New category fields
  @IsMongoId()
  @IsOptional()
  mainCategory?: string;

  @IsString()
  @IsOptional()
  mainCategoryEn?: string;

  @IsMongoId()
  @IsOptional()
  subCategory?: string;

  @IsString()
  @IsOptional()
  subCategoryEn?: string;

  // Product attributes
  @IsArray()
  @IsOptional()
  ageGroups?: string[];

  @IsArray()
  @IsOptional()
  sizes?: string[];

  @IsArray()
  @IsOptional()
  colors?: string[];

  @IsArray()
  @IsOptional()
  colorsEn?: string[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CategoryStructureDto)
  categoryStructure?: CategoryStructureDto;

  @IsNumber()
  countInStock!: number; // Legacy field

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsString()
  @IsOptional()
  brandLogo?: string;

  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @IsEnum(DeliveryType)
  @IsOptional()
  deliveryType?: DeliveryType;

  @IsNumber()
  @IsOptional()
  minDeliveryDays?: number;

  @IsNumber()
  @IsOptional()
  maxDeliveryDays?: number;

  @IsObject()
  @IsOptional()
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };

  @IsBoolean()
  @IsOptional()
  isOriginal?: boolean;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  materials?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  materialsEn?: string[];

  @IsString()
  @IsOptional()
  brandLogoUrl?: string;

  @IsBoolean()
  @IsOptional()
  addToPortfolio?: boolean;

  // Add the missing property for existing images
  @IsString()
  @IsOptional()
  existingImages?: string;
}

export class FindAllProductsDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  // Legacy field, keeping for backward compatibility
  @IsOptional()
  @IsString()
  category?: string;

  // New category system fields
  @IsOptional()
  @IsMongoId()
  mainCategory?: string;

  @IsOptional()
  @IsMongoId()
  subCategory?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: string;

  // Attribute filters
  @IsOptional()
  @IsString()
  ageGroup?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  includeVariants?: string;

  @IsOptional()
  @IsBoolean()
  isOriginal?: boolean;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  excludeOutOfStock?: string; // 'true' to exclude out of stock products
}

// We already have the correct DTO definitions with IsMongoId() decorators for mainCategory and subCategory
// Just ensure they're properly transformed to ObjectIds in the service
