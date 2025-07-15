import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgeGroupDto {
  @ApiProperty({ description: 'Age group name', example: 'ბავშვები' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Age group name in English',
    example: 'Children',
    required: false,
  })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiProperty({
    description: 'Age range description',
    example: '3-12 წელი',
    required: false,
  })
  @IsString()
  @IsOptional()
  ageRange?: string;

  @ApiProperty({
    description: 'Age group description',
    example: 'ბავშვები 3-დან 12 წლამდე',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Is age group active',
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAgeGroupDto {
  @ApiProperty({
    description: 'Age group name',
    example: 'ბავშვები',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Age group name in English',
    example: 'Children',
    required: false,
  })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiProperty({
    description: 'Age range description',
    example: '3-12 წელი',
    required: false,
  })
  @IsString()
  @IsOptional()
  ageRange?: string;

  @ApiProperty({
    description: 'Age group description',
    example: 'ბავშვები 3-დან 12 წლამდე',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Is age group active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
