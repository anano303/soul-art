import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '../../users/schemas/user.schema';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Review {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    default: null,
  })
  user!: User;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  rating!: number;

  @Prop({ required: true })
  comment!: string;
}

export enum ProductStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum DeliveryType {
  SELLER = 'SELLER',
  SoulArt = 'SoulArt'  // Changed from SOULART to SoulArt
}

@Schema({ timestamps: true })
export class Product {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    default: null,
  })
  user!: User;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  brand!: string;

  @Prop({ required: true })
  brandLogo!: string;

  @Prop({ required: true })
  category!: string;

  @Prop({ required: true, type: [String], default: [] })
  images!: string[];

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  reviews!: Review[];

  @Prop({ required: true, default: 0 })
  rating!: number;

  @Prop({ required: true, default: 0 })
  numReviews!: number;

  @Prop({ required: true, default: 0 })
  price!: number;

  @Prop({ required: true, default: 0 })
  countInStock!: number;

  @Prop({ required: true, default: ProductStatus.PENDING })
  status!: ProductStatus;

  @Prop({ type: String })
  rejectionReason?: string;

  @Prop({ type: String, enum: DeliveryType, default: DeliveryType.SoulArt })  // Changed default value
  deliveryType?: DeliveryType;

  @Prop({ type: Number })
  minDeliveryDays?: number;

  @Prop({ type: Number })
  maxDeliveryDays?: number;

  @Prop({ type: Object })
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
}

export const ProductSchema = SchemaFactory.createForClass(Product);
