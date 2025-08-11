import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'John Doe',
    minLength: 4,
    maxLength: 20,
  })
  @IsString()
  @MinLength(4, { message: 'Username is too short.' })
  @MaxLength(20, { message: 'Username is too long.' })
  name!: string;

  @ApiProperty({
    example: 'john@example.com',
  })
  @Transform(({ value }) => value.toLowerCase())
  @IsEmail({}, { message: 'Email address is not valid.' })
  email!: string;

  @ApiProperty({
    example: 'password123',
    minLength: 5,
    maxLength: 20,
  })
  @IsString()
  @MinLength(5, { message: 'Password is too short.' })
  @MaxLength(20, { message: 'Password is too long.' })
  password!: string;

  @ApiProperty({
    example: 'ABC12345',
    description: 'რეფერალური კოდი (არაუცილებელო)',
    required: false,
  })
  @IsOptional()
  @IsString()
  referralCode?: string;
}
