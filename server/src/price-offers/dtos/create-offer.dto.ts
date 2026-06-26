import {
  IsEmail,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateOfferDto {
  @IsMongoId()
  productId!: string;

  @IsNumber()
  @IsPositive()
  offeredPrice!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  // Buyer contact phone (admin-only visibility).
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  // ── Inline registration (used only when the requester is NOT logged in) ──
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(40)
  password?: string;
}
