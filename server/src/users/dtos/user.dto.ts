import { Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { Role } from '@/types/role.enum';

export class UserDto {
  @Expose()
  email!: string;

  @Expose()
  @Transform(({ key, obj }) => obj[key])
  _id!: ObjectId;

  @Expose()
  name!: string;

  @Expose()
  role?: Role;

  @Expose()
  accessToken?: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  // სელერის ველები
  @Expose()
  storeName?: string;

  @Expose()
  storeLogo?: string;

  @Expose()
  storeLogoPath?: string;

  @Expose()
  ownerFirstName?: string;

  @Expose()
  ownerLastName?: string;

  @Expose()
  phoneNumber?: string;

  @Expose()
  identificationNumber?: string;

  @Expose()
  accountNumber?: string;

  @Expose()
  beneficiaryBankCode?: string;

  @Expose()
  profileImagePath?: string;

  // ბალანსები
  @Expose()
  balance?: number;

  @Expose()
  referralBalance?: number;

  @Expose()
  salesCommissionBalance?: number;

  @Expose()
  totalSalesCommissions?: number;

  @Expose()
  salesRefCode?: string;

  @Expose()
  salesCommissionRate?: number;

  @Expose()
  referralCode?: string;

  @Expose()
  referredBy?: string;

  @Expose()
  sellerApprovedAt?: Date;

  @Expose()
  totalReferrals?: number;

  @Expose()
  totalEarnings?: number;

  // Artist profile
  @Expose()
  artistSlug?: string;

  @Expose()
  artistBio?: Map<string, string>;

  @Expose()
  artistCoverImage?: string;

  @Expose()
  artistDisciplines?: string[];

  @Expose()
  artistLocation?: string;

  @Expose()
  artistOpenForCommissions?: boolean;

  @Expose()
  artistSocials?: object;

  @Expose()
  artistHighlights?: string[];

  @Expose()
  artistGallery?: string[];
}
