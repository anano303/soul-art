import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommissionType } from '../schemas/commission.schema';

export class CreateCommissionDto {
  @IsEnum(CommissionType)
  type!: CommissionType;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  size!: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budget?: number;

  // Shipping (multipart strings from the form).
  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  desiredDueDate?: string;

  // When the request is placed from a specific artist's profile page.
  @IsOptional()
  @IsString()
  targetArtistId?: string;
}
