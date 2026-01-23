import {
  IsString,
  IsOptional,
  IsDate,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CampaignAppliesTo,
  CampaignDiscountSource,
} from '../schemas/campaign.schema';

export class CreateCampaignDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @IsOptional()
  @IsArray()
  @IsEnum(CampaignAppliesTo, { each: true })
  appliesTo?: CampaignAppliesTo[];

  @IsOptional()
  @IsBoolean()
  onlyProductsWithPermission?: boolean;

  @IsOptional()
  @IsEnum(CampaignDiscountSource)
  discountSource?: CampaignDiscountSource;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  maxDiscountPercent?: number;

  @IsOptional()
  @IsBoolean()
  useMaxAsOverride?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  badgeText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  badgeTextGe?: string;
}
