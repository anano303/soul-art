import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateEtsySettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  listingFeeGel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  commissionPercent?: number;

  @IsOptional()
  @IsBoolean()
  integrationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  enabledForAdmins?: boolean;
}
