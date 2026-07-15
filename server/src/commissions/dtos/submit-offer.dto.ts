import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SubmitOfferDto {
  @IsNumber()
  @Min(1)
  price!: number;

  @IsNumber()
  @Min(0)
  deliveryPrice!: number;

  @IsNumber()
  @Min(1)
  estimatedDays!: number;

  @IsOptional()
  @IsString()
  message?: string;
}
