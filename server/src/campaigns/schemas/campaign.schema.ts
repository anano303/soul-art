import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CampaignDocument = Campaign & Document;

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SCHEDULED = 'scheduled',
  ENDED = 'ended',
  PAUSED = 'paused',
}

export enum CampaignAppliesTo {
  INFLUENCER_REFERRALS = 'influencer_referrals',
  ALL_VISITORS = 'all_visitors',
}

export enum CampaignDiscountSource {
  PRODUCT_REFERRAL_DISCOUNT = 'product_referral_discount', // Use product's referralDiscountPercent
  ARTIST_DEFAULT = 'artist_default', // Use artist's defaultReferralDiscount
  OVERRIDE = 'override', // Use campaign's maxDiscountPercent
}

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Campaign {
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  name: string;

  @Prop({
    type: String,
    trim: true,
  })
  description?: string;

  @Prop({
    type: String,
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
    index: true,
  })
  status: CampaignStatus;

  @Prop({
    type: Date,
    required: true,
  })
  startDate: Date;

  @Prop({
    type: Date,
    required: true,
  })
  endDate: Date;

  @Prop({
    type: [String],
    enum: CampaignAppliesTo,
    default: [CampaignAppliesTo.INFLUENCER_REFERRALS],
  })
  appliesTo: CampaignAppliesTo[];

  @Prop({
    type: Boolean,
    default: true,
  })
  onlyProductsWithPermission: boolean; // Only apply to products that have referralDiscountPercent > 0

  @Prop({
    type: String,
    enum: CampaignDiscountSource,
    default: CampaignDiscountSource.PRODUCT_REFERRAL_DISCOUNT,
  })
  discountSource: CampaignDiscountSource;

  @Prop({
    type: Number,
    min: 0,
    max: 50,
    default: 15,
  })
  maxDiscountPercent: number; // Maximum allowed discount (override or cap)

  @Prop({
    type: Boolean,
    default: false,
  })
  useMaxAsOverride: boolean; // If true, use maxDiscountPercent as override instead of cap

  @Prop({
    type: String,
    trim: true,
  })
  badgeText?: string; // e.g., "Special partner price", "Campaign price"

  @Prop({
    type: String,
    trim: true,
  })
  badgeTextGe?: string; // Georgian version

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy: Types.ObjectId;

  @Prop({
    type: Number,
    default: 0,
  })
  totalOrders: number; // Analytics: total orders during campaign

  @Prop({
    type: Number,
    default: 0,
  })
  totalRevenue: number; // Analytics: total revenue

  @Prop({
    type: Number,
    default: 0,
  })
  totalDiscount: number; // Analytics: total discount given
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);

// Indexes
CampaignSchema.index({ status: 1, startDate: 1, endDate: 1 });
CampaignSchema.index({ createdAt: -1 });
