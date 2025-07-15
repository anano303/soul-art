import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Category ID',
    example: '60d21b4667d0d8992e610c85',
  })
  _id: string;

  @ApiProperty({ description: 'Category name', example: 'ტანსაცმელი' })
  name: string;

  @ApiProperty({ description: 'Category name in English', example: 'Clothing' })
  nameEn?: string;

  @ApiProperty({
    description: 'Category description',
    example: 'სხვადასხვა ტიპის ტანსაცმელი',
  })
  description?: string;

  @ApiProperty({
    description: 'Category description in English',
    example: 'Various types of clothing',
  })
  descriptionEn?: string;

  @ApiProperty({ description: 'Is category active', default: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-06-20T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-06-20T12:00:00Z',
  })
  updatedAt: Date;
}

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'ტანსაცმელი' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Category name in English',
    example: 'Clothing',
    required: false,
  })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiProperty({
    description: 'Category description',
    required: false,
    example: 'სხვადასხვა ტიპის ტანსაცმელი',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Category description in English',
    required: false,
    example: 'Various types of clothing',
  })
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiProperty({
    description: 'Is category active',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    required: false,
    example: 'ტანსაცმელი',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Category name in English',
    required: false,
    example: 'Clothing',
  })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiProperty({
    description: 'Category description',
    required: false,
    example: 'სხვადასხვა ტიპის ტანსაცმელი',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Category description in English',
    required: false,
    example: 'Various types of clothing',
  })
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiProperty({ description: 'Is category active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
