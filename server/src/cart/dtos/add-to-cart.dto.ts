import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ProductDocument } from 'src/products/schemas/product.schema';

export class AddToCartDto {
  @IsOptional()
  product?: ProductDocument;

  @IsNumber()
  qty!: number;

  @IsString()
  productId!: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  ageGroup?: string;
}
