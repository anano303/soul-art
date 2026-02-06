import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuctionAdminEarningsDocument = AuctionAdminEarnings & Document;

@Schema({ timestamps: true })
export class AuctionAdminEarnings {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  auctionAdminId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true })
  auctionId: Types.ObjectId;

  // Auction sale details (without delivery fee)
  @Prop({ required: true })
  saleAmount: number; // Final auction price (currentPrice)

  // Platform commission from this sale
  @Prop({ required: true })
  platformCommissionAmount: number;

  // Auction admin's share of the platform commission
  @Prop({ required: true })
  auctionAdminCommissionPercent: number;

  @Prop({ required: true })
  auctionAdminEarnings: number;

  // Seller info for reference
  @Prop({ type: Types.ObjectId, ref: 'User' })
  sellerId: Types.ObjectId;

  @Prop()
  sellerName: string;

  // Buyer info for reference
  @Prop({ type: Types.ObjectId, ref: 'User' })
  buyerId: Types.ObjectId;

  @Prop()
  buyerName: string;

  // Auction details
  @Prop()
  auctionTitle: string;

  @Prop()
  paidAt: Date;

  @Prop({ default: false })
  isWithdrawn: boolean;

  @Prop()
  withdrawnAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const AuctionAdminEarningsSchema =
  SchemaFactory.createForClass(AuctionAdminEarnings);

// Indexes
AuctionAdminEarningsSchema.index({ auctionAdminId: 1, createdAt: -1 });
AuctionAdminEarningsSchema.index({ auctionId: 1 }, { unique: true });
AuctionAdminEarningsSchema.index({ isWithdrawn: 1 });
