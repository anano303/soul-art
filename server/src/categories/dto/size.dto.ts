import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSizeDto {
  @ApiProperty({ description: 'Size value', example: 'XL' })
  @IsString()
  value: string;

  @ApiProperty({
    description: 'Size category',
    example: 'CLOTHING',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Size description',
    example: 'Extra Large',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Is size active',
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateSizeDto {
  @ApiProperty({ description: 'Size value', example: 'XL', required: false })
  @IsString()
  @IsOptional()
  value?: string;

  @ApiProperty({
    description: 'Size category',
    example: 'CLOTHING',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Size description',
    example: 'Extra Large',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Is size active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
