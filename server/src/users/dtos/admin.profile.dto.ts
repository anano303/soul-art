import { Role } from '@/types/role.enum';
import { SellerType } from '@/types/seller-type.enum';
import {
  IsBoolean,
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ArtistSocialLinksDto } from './update-artist-profile.dto';

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

  // სოციალური ბმულები (Facebook და სხვა) — ინახება artistSocials-ში
  @IsOptional()
  @ValidateNested()
  @Type(() => ArtistSocialLinksDto)
  artistSocials?: ArtistSocialLinksDto;

  // იღებს თუ არა ინდივიდუალურ შეკვეთებს
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value === 'true' : value,
  )
  @IsBoolean()
  artistOpenForCommissions?: boolean;

  // მხატვარი / ხელნაკეთი ნივთები / ორივე
  @IsOptional()
  @IsEnum(SellerType)
  sellerType?: SellerType;
}
