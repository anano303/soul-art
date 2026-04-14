import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PromotionDocument = Promotion & Document;

@Schema({ timestamps: true })
export class Promotion {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Product', index: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  productPrice: number;

  @Prop()
  productImage: string;

  @Prop({ required: true })
  productUrl: string;

  @Prop({ type: [String], required: true })
  platforms: string[];

  @Prop({ required: true })
  duration: number; // days

  @Prop({ required: true })
  totalPrice: number; // GEL paid

  @Prop()
  note: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  sellerId: Types.ObjectId;

  @Prop({ required: true })
  sellerName: string;

  @Prop({ required: true })
  sellerEmail: string;

  @Prop({ required: true })
  externalOrderId: string;

  @Prop({
    required: true,
    enum: ['paid', 'confirmed', 'expired'],
    default: 'paid',
    index: true,
  })
  status: 'paid' | 'confirmed' | 'expired';

  @Prop()
  confirmedAt: Date;

  @Prop()
  expiresAt: Date;

  @Prop({ default: false })
  expiryNotified: boolean;

  // Stats tracked during promotion period (confirmedAt → expiresAt)
  @Prop({ default: 0 })
  statsViews: number;

  @Prop({ default: 0 })
  statsAddToCart: number;

  @Prop({ default: 0 })
  statsOrders: number;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);
