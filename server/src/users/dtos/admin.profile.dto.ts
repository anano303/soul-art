import { Role } from '@/types/role.enum';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class AdminProfileDto {
  @IsString()
  @MinLength(4, { message: 'Username is too short.' })
  @MaxLength(20, { message: 'Username is too long.' })
  name: string;

  @IsEmail({}, { message: 'Email address is not valid.' })
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password is too short.' })
  @MaxLength(20, { message: 'Password is too long.' })
  password: string;

  @IsEnum(Role)
  @Transform(({ value }) => value as Role)
  role: Role;

  // სელერის ველები
  @IsOptional()
  @IsString()
  storeName?: string;

  @IsOptional()
  @IsString()
  ownerFirstName?: string;

  @IsOptional()
  @IsString()
  ownerLastName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  identificationNumber?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  // Sales Manager საკომისიო პროცენტი
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  salesCommissionRate?: number;
}
