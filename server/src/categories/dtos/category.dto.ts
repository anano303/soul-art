import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
