import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitOfferDto {
  // @Type — the form is sent as multipart when the artist attaches samples,
  // so numbers arrive as strings.
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  price!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deliveryPrice!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  estimatedDays!: number;

  @IsOptional()
  @IsString()
  message?: string;

  // "true" → drop the previously uploaded samples (when no new files are sent).
  @IsOptional()
  @IsString()
  clearSamples?: string;
}
