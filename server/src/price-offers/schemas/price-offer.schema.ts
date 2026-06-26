import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Product } from '@/products/schemas/product.schema';
import { User } from '@/users/schemas/user.schema';

export enum PriceOfferStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected',
}

export type PriceOfferDocument = PriceOffer & Document;

@Schema({ timestamps: true })
export class PriceOffer {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  })
  product!: Product;

  // Snapshot of the product name so admin/email stays readable even if the
  // product later changes or is removed.
  @Prop()
  productName?: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  seller!: User;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  requester!: User;

  @Prop()
  requesterName?: string;

  @Prop()
  requesterEmail?: string;

  // Buyer's contact phone — visible to ADMIN ONLY, never exposed to the seller.
  @Prop()
  requesterPhone?: string;

  // Effective product price at request time (for transparency / comparison).
  @Prop({ required: true })
  originalPrice!: number;

  @Prop({ required: true })
  offeredPrice!: number;

  // Optional note from the buyer.
  @Prop()
  message?: string;

  // Optional response note from the seller.
  @Prop()
  sellerMessage?: string;

  @Prop({
    type: String,
    enum: PriceOfferStatus,
    default: PriceOfferStatus.Pending,
    index: true,
  })
  status!: PriceOfferStatus;

  // Set true once the accepted price has been consumed in an order, so it
  // can't be reused.
  @Prop({ default: false })
  used!: boolean;

  @Prop()
  respondedAt?: Date;
}

export const PriceOfferSchema = SchemaFactory.createForClass(PriceOffer);

// One pending offer per (requester, product) — a buyer can't spam the same item.
PriceOfferSchema.index(
  { requester: 1, product: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: PriceOfferStatus.Pending },
  },
);
