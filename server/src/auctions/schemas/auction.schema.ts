import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Transform } from 'class-transformer';

export type AuctionDocument = Auction & Document;

export enum AuctionStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

export enum ArtworkType {
  ORIGINAL = 'ORIGINAL',
  REPRODUCTION = 'REPRODUCTION',
}

@Schema()
export class AuctionBid {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  bidder: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop()
  bidderName: string; // Cache bidder name for quick display
}

export const AuctionBidSchema = SchemaFactory.createForClass(AuctionBid);

@Schema()
export class AuctionComment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  userName: string; // Cache user name for quick display

  @Prop()
  userAvatar?: string; // Cache user avatar
}

export const AuctionCommentSchema =
  SchemaFactory.createForClass(AuctionComment);

@Schema({ timestamps: true })
export class Auction {
  @Transform(({ value }) => value.toString())
  _id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  seller: Types.ObjectId;

  // Artwork Details
  @Prop({ required: true, enum: ArtworkType })
  artworkType: ArtworkType;

  @Prop({ required: true })
  dimensions: string; // e.g., "50x70 cm"

  @Prop({ required: true })
  material: string; // e.g., "Oil on Canvas", "Watercolor", etc.

  // Images
  @Prop({ required: true })
  mainImage: string; // Primary high-quality image

  @Prop([String])
  additionalImages: string[]; // Additional photos

  // Auction Settings
  @Prop({ required: true })
  startingPrice: number;

  @Prop({ required: true })
  minimumBidIncrement: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  startTime: string; // Format: "HH:MM" in Georgia timezone

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  endTime: string; // Format: "HH:MM" in Georgia timezone

  // Delivery Information
  @Prop({ required: true, enum: ['SOULART', 'ARTIST'], default: 'SOULART' })
  deliveryType: string; // SOULART or ARTIST

  @Prop({ required: true, default: 1 })
  deliveryDaysMin: number; // Minimum days for delivery

  @Prop({ required: true, default: 3 })
  deliveryDaysMax: number; // Maximum days for delivery

  @Prop()
  deliveryInfo: string; // Additional delivery information (optional)

  // Current Auction State
  @Prop({ default: 0 })
  currentPrice: number; // Current highest bid

  @Prop({ type: Types.ObjectId, ref: 'User' })
  currentWinner?: Types.ObjectId;

  @Prop([AuctionBidSchema])
  bids: AuctionBid[];

  @Prop([AuctionCommentSchema])
  comments: AuctionComment[];

  @Prop({ default: 0 })
  totalBids: number;

  @Prop({ enum: AuctionStatus, default: AuctionStatus.PENDING })
  status: AuctionStatus;

  @Prop({ default: 0 })
  relistCount: number;

  @Prop()
  activatedAt?: Date;

  @Prop()
  endedAt?: Date;

  // Winner Payment
  @Prop({ default: false })
  isPaid: boolean;

  @Prop()
  paymentDeadline: Date; // 24 საათი გადახდისთვის

  @Prop()
  paymentDate: Date;

  // Delivery fee for winner (Tbilisi: 12, Region: 18)
  @Prop({ enum: ['TBILISI', 'REGION'], default: 'TBILISI' })
  winnerDeliveryZone?: string;

  @Prop({ default: 0 })
  deliveryFee: number;

  // Total payment (currentPrice + deliveryFee)
  @Prop({ default: 0 })
  totalPayment: number;

  // Shipping Address for winner
  @Prop({ type: Object })
  shippingAddress?: {
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    phoneNumber?: string;
  };

  // BOG Payment Info
  @Prop()
  bogOrderId?: string; // BOG's internal order ID

  @Prop()
  externalOrderId?: string; // Our generated unique ID for BOG callback

  @Prop({ type: Object })
  paymentResult?: {
    id: string;
    status: string;
    update_time: string;
    email_address?: string;
  };

  // Commission (10%)
  @Prop()
  commissionAmount: number;

  @Prop()
  sellerEarnings: number;

  // Admin fields
  @Prop({ default: false })
  isApproved: boolean;

  @Prop()
  rejectionReason: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy: Types.ObjectId;

  @Prop()
  approvedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  cancelledBy?: Types.ObjectId;

  @Prop()
  cancelledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const AuctionSchema = SchemaFactory.createForClass(Auction);

// Indexes for performance
AuctionSchema.index({ status: 1, endDate: 1 });
AuctionSchema.index({ status: 1, startDate: 1 });
AuctionSchema.index({ seller: 1, createdAt: -1 });
AuctionSchema.index({ currentWinner: 1 });
AuctionSchema.index({ endDate: 1, status: 1 });
