import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Buyer edits the contact / delivery details of their own commission.
 * Every field is optional — only what is sent gets overwritten.
 */
export class UpdateCommissionContactDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;
}
