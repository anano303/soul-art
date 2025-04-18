import { IsString, IsNumber, IsArray, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ProductStatus, DeliveryType } from '../schemas/product.schema';

export class ProductDto {
  @IsString()
  name!: string;

  @IsNumber()
  price!: number;

  @IsString()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  images!: string[];

  @IsString()
  brand!: string;

  @IsString()
  category!: string;

  @IsNumber()
  countInStock!: number;

  @IsString()
  brandLogo!: string;

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
}
