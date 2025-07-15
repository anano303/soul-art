import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsMongoId,
} from 'class-validator';

export class SubCategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsMongoId()
  categoryId: string;

  @IsArray()
  @IsOptional()
  ageGroups?: string[];

  @IsArray()
  @IsOptional()
  sizes?: string[];

  @IsArray()
  @IsOptional()
  colors?: string[];

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
