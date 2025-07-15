import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import {
  CartItem as CartItemInterface,
  ShippingDetails,
} from '../../interfaces';

export type CartDocument = Cart & Document;

@Schema()
export class CartItem {
  @Prop({ required: true, type: String })
  productId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  nameEn?: string;

  @Prop({ required: true })
  image: string;

  @Prop({ required: true, default: 0 })
  price: number;

  @Prop({ required: true, default: 0 })
  countInStock: number;

  @Prop({ required: true, default: 1 })
  qty: number;

  @Prop({ required: false, type: String })
  size?: string;

  @Prop({ required: false, type: String })
  color?: string;

  @Prop({ required: false, type: String })
  ageGroup?: string;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId!: User;

  @Prop({ type: [CartItemSchema], default: [] })
  items!: CartItem[];

  @Prop({ default: 0 })
  itemsPrice!: number;

  @Prop({ default: 0 })
  taxPrice!: number;

  @Prop({ default: 0 })
  shippingPrice!: number;

  @Prop({ default: 0 })
  totalPrice!: number;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
