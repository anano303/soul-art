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

  // OAuth provider IDs
  @Prop({ type: String, default: null })
  googleId?: string | null;

  @Prop({ type: String, default: null })
  facebookId?: string | null;

  @Prop({ type: String, default: null })
  avatar?: string | null;

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
        refreshToken: { type: String, required: false, default: null }, // Per-device refresh token (optional for migration)
        refreshTokenJti: { type: String, required: false, default: null }, // JTI for validation (optional for migration)
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
    refreshToken?: string | null;
    refreshTokenJti?: string | null;
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

  @Prop({ type: String, default: null })
  beneficiaryBankCode?: string; // SWIFT/BIC code (e.g., BAGAGE22, TBCBGE22)

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

  // Sales Manager კომისიების ბალანსი
  @Prop({ type: Number, default: 0 })
  salesCommissionBalance?: number;

  // Sales Manager-ის მთლიანი მიღებული კომისიები
  @Prop({ type: Number, default: 0 })
  totalSalesCommissions?: number;

  // Sales Manager-ის უნიკალური რეფერალური კოდი (PROMO12345)
  @Prop({ type: String, unique: true, sparse: true })
  salesRefCode?: string;

  // Sales Manager pending withdrawal
  @Prop({ type: Number, default: 0 })
  salesPendingWithdrawal?: number;

  // Sales Manager total withdrawn
  @Prop({ type: Number, default: 0 })
  salesTotalWithdrawn?: number;

  // Sales Manager ინდივიდუალური საკომისიო პროცენტი (default: 3%)
  @Prop({ type: Number, default: 3 })
  salesCommissionRate?: number;

  // Campaign/Referral discount settings for sellers
  // Choice: 'all' = allow on all products, 'per_product' = choose per product, 'none' = no discounts
  @Prop({ type: String, enum: ['all', 'per_product', 'none'], default: 'none' })
  campaignDiscountChoice?: 'all' | 'per_product' | 'none';

  // Default discount % that SoulArt can apply during campaigns (when choice is 'all')
  @Prop({ type: Number, min: 0, max: 50, default: 0 })
  defaultReferralDiscount?: number; // 0 = no permission, >0 = allowed %

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

  // Auction Admin fields
  @Prop({ type: Number, default: 0 })
  auctionAdminBalance?: number; // Available balance for withdrawal

  @Prop({ type: Number, default: 0 })
  auctionAdminPendingWithdrawal?: number; // Pending withdrawal amount

  @Prop({ type: Number, default: 0 })
  auctionAdminTotalEarnings?: number; // Total earned from auctions

  @Prop({ type: Number, default: 0 })
  auctionAdminTotalWithdrawn?: number; // Total amount withdrawn

  // Managed brands - allows user to edit products of these brands
  @Prop({ type: [String], default: [] })
  managedBrands?: string[];

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

  // Follower system
  @Prop({
    type: [{ type: String, ref: 'User' }],
    default: [],
  })
  followers?: string[]; // Array of user IDs who follow this user

  @Prop({
    type: [{ type: String, ref: 'User' }],
    default: [],
  })
  following?: string[]; // Array of user IDs this user follows

  @Prop({ type: Number, default: 0 })
  followersCount?: number; // Cached count for performance

  @Prop({ type: Number, default: 0 })
  followingCount?: number; // Cached count for performance

  // Artist rating (calculated from product reviews)
  @Prop({ type: Number, default: 0, min: 0, max: 5 })
  artistRating?: number; // Average rating from all artist's product reviews

  @Prop({ type: Number, default: 0 })
  artistReviewsCount?: number; // Total number of reviews across all products

  // Direct artist reviews (not product reviews)
  @Prop({
    type: [
      {
        userId: { type: String, required: true, ref: 'User' },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, required: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  artistDirectReviews?: Array<{
    userId: string;
    rating: number;
    comment?: string;
    createdAt: Date;
  }>;

  @Prop({ type: Number, default: 0, min: 0, max: 5 })
  artistDirectRating?: number; // Average of direct artist reviews

  @Prop({ type: Number, default: 0 })
  artistDirectReviewsCount?: number; // Count of direct artist reviews

  @Prop({ type: Number, default: 0 })
  profileViews?: number; // Total profile page views

  @Prop({
    type: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: {
          type: String,
          enum: ['info', 'warning', 'success'],
          default: 'info',
        },
        category: {
          type: String,
          enum: ['admin', 'product', 'suggestion', 'system'],
          default: 'system',
        },
        priority: { type: Number, default: 0 },
        actionUrl: { type: String, default: null },
        actionLabel: { type: String, default: null },
        createdAt: { type: Date, default: Date.now },
        createdByUserId: { type: String, default: null },
        readAt: { type: Date, default: null },
      },
    ],
    default: [],
  })
  sellerNotifications?: Array<{
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success';
    category?: 'admin' | 'product' | 'suggestion' | 'system';
    priority?: number;
    actionUrl?: string | null;
    actionLabel?: string | null;
    createdAt: Date;
    createdByUserId?: string | null;
    readAt?: Date | null;
  }>;

  // Shipping addresses
  @Prop({
    type: [
      {
        _id: { type: String, required: true },
        label: { type: String, default: 'Home' },
        address: { type: String, required: true },
        city: { type: String, required: true },
        postalCode: { type: String, required: false },
        country: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  shippingAddresses?: Array<{
    _id: string;
    label?: string;
    address: string;
    city: string;
    postalCode?: string;
    country: string;
    phoneNumber: string;
    isDefault: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', function (next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});
