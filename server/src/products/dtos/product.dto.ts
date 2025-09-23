import {
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  IsOptional,
  IsObject,
  ValidateNested,
} from 'class-validator';
import {
  ProductStatus,
  DeliveryType,
  MainCategory,
} from '../schemas/product.schema';
import { Type } from 'class-transformer';

class CategoryStructureDto {
  @IsEnum(MainCategory)
  main: MainCategory;

  @IsString()
  sub: string;
}

export class ProductDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsNumber()
  price!: number;

  @IsString()
  description!: string;

  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @IsArray()
  @IsString({ each: true })
  images!: string[];

  @IsString()
  brand!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CategoryStructureDto)
  categoryStructure?: CategoryStructureDto;

  @IsNumber()
  countInStock!: number;

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

  @IsString()
  @IsOptional()
  brandLogoUrl?: string;
}
