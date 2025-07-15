import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsMongoId,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubCategoryDto {
  @ApiProperty({ description: 'Subcategory name', example: 'მაისურები' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Subcategory name in English',
    example: 'T-shirts',
    required: false,
  })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiProperty({
    description: 'Parent category ID',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsMongoId()
  categoryId: string;

  @ApiProperty({
    description: 'Available age groups',
    required: false,
    example: ['ბავშვები', 'მოზრდილები'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ageGroups?: string[];

  @ApiProperty({
    description: 'Available sizes',
    required: false,
    example: ['S', 'M', 'L', 'XL'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sizes?: string[];

  @ApiProperty({
    description: 'Available colors',
    required: false,
    example: ['შავი', 'თეთრი', 'წითელი'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  colors?: string[];
  @ApiProperty({
    description: 'Subcategory description',
    required: false,
    example: 'მაისურები ყველა სეზონისთვის',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Subcategory description in English',
    required: false,
    example: 'T-shirts for all seasons',
  })
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiProperty({
    description: 'Is subcategory active',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateSubCategoryDto {
  @ApiProperty({
    description: 'Subcategory name',
    required: false,
    example: 'მაისურები',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Subcategory name in English',
    required: false,
    example: 'T-shirts',
  })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiProperty({
    description: 'Parent category ID',
    required: false,
    example: '60d21b4667d0d8992e610c85',
  })
  @IsMongoId()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    description: 'Available age groups',
    required: false,
    example: ['ბავშვები', 'მოზრდილები'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ageGroups?: string[];

  @ApiProperty({
    description: 'Available sizes',
    required: false,
    example: ['S', 'M', 'L', 'XL'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sizes?: string[];

  @ApiProperty({
    description: 'Available colors',
    required: false,
    example: ['შავი', 'თეთრი', 'წითელი'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  colors?: string[];
  @ApiProperty({
    description: 'Subcategory description',
    required: false,
    example: 'მაისურები ყველა სეზონისთვის',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Subcategory description in English',
    required: false,
    example: 'T-shirts for all seasons',
  })
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiProperty({ description: 'Is subcategory active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// Add DTOs for attribute operations
export class AttributeDto {
  @ApiProperty({ description: 'Attribute value', example: 'წითელი' })
  @IsString()
  value: string;

  @ApiProperty({
    description: 'Attribute value in English',
    example: 'Red',
    required: false,
  })
  @IsString()
  @IsOptional()
  nameEn?: string;
}

export class AttributesArrayDto {
  @ApiProperty({
    description: 'Array of attribute values',
    example: ['წითელი', 'ლურჯი', 'შავი'],
  })
  @IsArray()
  @IsString({ each: true })
  values: string[];
}
