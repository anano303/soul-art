import {
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  IsArray,
  IsOptional,
  Min,
  MaxLength,
  IsUrl,
  Matches,
  ValidateNested,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ArtworkType } from '../schemas/auction.schema';

export class CreateAuctionDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsEnum(ArtworkType)
  artworkType: ArtworkType;

  @IsString()
  @MaxLength(50)
  dimensions: string; // e.g., "50x70 cm"

  @IsString()
  @MaxLength(100)
  material: string;

  @IsUrl()
  mainImage: string;

  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  additionalImages?: string[];

  @IsNumber()
  @Min(1)
  startingPrice: number;

  @IsNumber()
  @Min(1)
  minimumBidIncrement: number;

  @IsDateString()
  startDate: string; // ISO date string

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime: string;

  @IsDateString()
  endDate: string; // ISO date string

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) // HH:MM format
  endTime: string;

  @IsString()
  @IsOptional()
  deliveryType?: string; // SOULART or ARTIST

  @IsNumber()
  @Min(1)
  deliveryDaysMin: number;

  @IsNumber()
  @Min(1)
  deliveryDaysMax: number;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  deliveryInfo?: string;

  // Optional sellerId - used by AuctionAdmin to create auction for a seller
  @IsOptional()
  @IsMongoId()
  sellerId?: string;
}

export class PlaceBidDto {
  @IsString()
  auctionId: string;

  @IsNumber()
  @Min(1)
  bidAmount: number;
}

export class UpdateAuctionStatusDto {
  @IsEnum(['PENDING', 'ACTIVE', 'ENDED', 'CANCELLED'])
  status: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class AuctionFilterDto {
  @IsOptional()
  @IsEnum(ArtworkType)
  artworkType?: ArtworkType;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  dimensions?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 12;
}

export class AdminCreateAuctionDto extends CreateAuctionDto {
  @IsMongoId()
  sellerId: string;
}

export class RescheduleAuctionDto extends CreateAuctionDto {}

// Winner payment DTO
export class WinnerPaymentDto {
  @IsString()
  @IsEnum(['TBILISI', 'REGION'])
  deliveryZone: 'TBILISI' | 'REGION';
}

// Delivery fee constants
export const DELIVERY_FEES = {
  TBILISI: 12,
  REGION: 18,
} as const;
