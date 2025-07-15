import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateColorDto {
  @ApiProperty({ description: 'Color name', example: 'წითელი' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Color name in English',
    example: 'Red',
    required: false,
  })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiProperty({
    description: 'Color hex code',
    example: '#FF0000',
    required: false,
  })
  @IsString()
  @IsOptional()
  hexCode?: string;

  @ApiProperty({
    description: 'Color description',
    example: 'მკვეთრი წითელი',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Is color active',
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateColorDto {
  @ApiProperty({
    description: 'Color name',
    example: 'წითელი',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Color name in English',
    example: 'Red',
    required: false,
  })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiProperty({
    description: 'Color hex code',
    example: '#FF0000',
    required: false,
  })
  @IsString()
  @IsOptional()
  hexCode?: string;

  @ApiProperty({
    description: 'Color description',
    example: 'მკვეთრი წითელი',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Is color active',
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
