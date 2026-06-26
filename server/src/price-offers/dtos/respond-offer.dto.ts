import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RespondOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sellerMessage?: string;
}
