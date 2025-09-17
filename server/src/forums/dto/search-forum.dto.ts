import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchForumDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  take?: number = 20;
}