import { IsOptional, IsString } from 'class-validator';

export class SaveShippingDetailsDto {
  @IsString()
  address!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsString()
  country!: string;

  @IsString()
  phoneNumber!: string;
}
