import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '@/types/role.enum';

export interface ArtistSocialLinks {
  instagram?: string;
  facebook?: string;
  behance?: string;
  dribbble?: string;
  website?: string;
  tiktok?: string;
  youtube?: string;
  pinterest?: string;
}

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret.__v;
      delete ret.password;
      ret.createdAt = ret.createdAt;
    },
  },
})
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: String })
  password: string;

  @Prop({ type: String, enum: Role, default: Role.User })
  role: Role;
  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  // Legacy fields - keep for backward compatibility during migration
  @Prop({ type: String, default: null })
  refreshToken?: string | null;

  @Prop({ type: String, default: null })
  sessionId?: string;

  @Prop({ type: Date, default: Date.now })
  lastActivity?: Date;

  // Enhanced device tracking with per-device tokens
  @Prop({
    type: [
      {
        fingerprint: { type: String, required: true },
        userAgent: { type: String, required: true },
        lastSeen: { type: Date, default: Date.now },
        trusted: { type: Boolean, default: false },
        sessionId: { type: String, required: true },
        refreshToken: { type: String, required: true }, // Per-device refresh token
        refreshTokenJti: { type: String, required: true }, // JTI for validation
        isActive: { type: Boolean, default: true }, // Can revoke individual devices
      },
    ],
    default: [],
  })
  knownDevices?: Array<{
    fingerprint: string;
    userAgent: string;
    lastSeen: Date;
    trusted: boolean;
    sessionId: string;
    refreshToken: string;
    refreshTokenJti: string;
    isActive: boolean;
  }>;

  // 👇 **ეს ველები მხოლოდ Seller-ს დასჭირდება, ამიტომ `required: false` ვუტოვებთ**
  @Prop({ type: String, default: null })
  storeName?: string;

  @Prop({ type: String, default: null })
  storeLogo?: string;

  @Prop({ type: String, default: null })
  storeLogoPath?: string;

  @Prop({ type: String, default: null })
  ownerFirstName?: string;

  @Prop({ type: String, default: null })
  ownerLastName?: string;

  @Prop({ type: String, default: null })
  phoneNumber?: string;

  @Prop({ type: String, default: null })
  identificationNumber?: string;

  @Prop({ type: String, default: null })
  accountNumber?: string;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop({ type: String, default: null })
  profileImagePath: string;

  // სელერის ბალანსი (გაყიდვებიდან)
  @Prop({ type: Number, default: 0 })
  balance?: number;

  // რეფერალების ბალანსი (ცალკე სელერის ბალანსისგან)
  @Prop({ type: Number, default: 0 })
  referralBalance?: number;

  // რეფერალების სისტემა
  @Prop({ type: String, unique: true, sparse: true })
  referralCode?: string; // უნიკალური რეფერალური კოდი

  @Prop({ type: String, default: null })
  referredBy?: string; // ვისი რეფერალური კოდით დარეგისტრირდა

  @Prop({ type: Date, default: null })
  sellerApprovedAt?: Date; // როდის დამტკიცდა სელერად

  @Prop({ type: Number, default: 0 })
  totalReferrals?: number; // მოწვეული სელერების რაოდენობა

  @Prop({ type: Number, default: 0 })
  totalEarnings?: number; // მიღებული ბონუსების ჯამი

  @Prop({ type: Number, default: 0 })
  monthlyWithdrawals?: number; // ამ თვეში გატანილი თანხების რაოდენობა

  @Prop({ type: Date, default: null })
  lastWithdrawalReset?: Date; // ბოლო თვიური რესეტის თარიღი

  // Artist profile enhancements
  @Prop({ type: String, unique: true, sparse: true, index: true })
  artistSlug?: string | null;

  @Prop({ type: Map, of: String, default: undefined })
  artistBio?: Map<string, string>;

  @Prop({ type: String, default: null })
  artistCoverImage?: string | null;

  @Prop({ type: [String], default: [] })
  artistDisciplines?: string[];

  @Prop({ type: String, default: null })
  artistLocation?: string | null;

  @Prop({ type: Boolean, default: false })
  artistOpenForCommissions?: boolean;

  @Prop({ type: Object, default: {} })
  artistSocials?: ArtistSocialLinks;

  @Prop({ type: [String], default: [] })
  artistHighlights?: string[];

  @Prop({ type: [String], default: [] })
  artistGallery?: string[];
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', function (next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});
