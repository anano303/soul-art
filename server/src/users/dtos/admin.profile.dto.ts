import { Role } from '@/types/role.enum';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class AdminProfileDto {
  @IsString()
  @MinLength(4, { message: 'Username is too short.' })
  @MaxLength(20, { message: 'Username is too long.' })
  name: string;

  @IsEmail({}, { message: 'Email address is not valid.' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password is too short.' })
  @MaxLength(20, { message: 'Password is too long.' })
  password: string;

  @IsEnum(Role)
  @Transform(({ value }) => value as Role)
  role: Role;
}
