import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuctionSettingsDocument = AuctionSettings & Document;

@Schema({ timestamps: true })
export class AuctionSettings {
  @Prop({ required: true, unique: true, default: 'auction_commission' })
  key: string;

  // Auction admin commission percentage from sale price (default 30%)
  @Prop({ required: true, default: 30 })
  auctionAdminCommissionPercent: number;

  // Platform (website) commission percentage from sale price (default 10%)
  @Prop({ required: true, default: 10 })
  platformCommissionPercent: number;

  // Seller gets the remaining percentage (100 - auctionAdmin - platform = 60%)

  // The user who is the auction admin
  @Prop({ type: Types.ObjectId, ref: 'User' })
  auctionAdminUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const AuctionSettingsSchema =
  SchemaFactory.createForClass(AuctionSettings);

// Ensure only one settings document exists
AuctionSettingsSchema.index({ key: 1 }, { unique: true });
