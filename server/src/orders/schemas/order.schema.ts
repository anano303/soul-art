import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { OrderItem, PaymentResult, ShippingDetails } from 'src/interfaces';
import { User } from 'src/users/schemas/user.schema';

export type OrderDocument = Order & mongoose.Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' })
  user!: User;

  @Prop({
    required: true,
    type: [
      {
        name: { required: true, type: String },
        nameEn: { required: false, type: String },
        qty: { required: true, type: Number },
        image: { required: true, type: String },
        price: { required: true, type: Number },
        size: { required: false, type: String },
        color: { required: false, type: String },
        ageGroup: { required: false, type: String },
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
        product: {
          type: {
            deliveryType: { type: String }, // Use String type instead of enum
            minDeliveryDays: { type: Number },
            maxDeliveryDays: { type: Number },
            dimensions: {
              type: {
                width: { type: Number },
                height: { type: Number },
                depth: { type: Number },
              },
            },
          },
        },
      },
    ],
  })
  orderItems!: OrderItem[];

  @Prop({
    required: true,
    type: {
      address: { required: true, type: String },
      city: { required: true, type: String },
      postalCode: { required: false, type: String },
      country: { required: true, type: String },
      phoneNumber: { required: false, type: String },
    },
  })
  shippingDetails!: ShippingDetails;

  @Prop({ required: true })
  paymentMethod!: string;

  @Prop({
    required: false,
    type: {
      id: { required: true, type: String },
      status: { required: true, type: String },
      update_time: { required: true, type: String },
      email_address: { required: true, type: String },
    },
  })
  paymentResult!: PaymentResult;

  @Prop({ required: true, default: 0.0 })
  taxPrice!: number;

  @Prop({ required: true, default: 0.0 })
  shippingPrice!: number;

  @Prop({ required: true, default: 0.0 })
  itemsPrice!: number;

  @Prop({ required: true, default: 0.0 })
  totalPrice!: number;

  @Prop({ default: false })
  isPaid!: boolean;

  @Prop({ required: false })
  paidAt!: string;

  @Prop({ default: false })
  isDelivered!: boolean;

  @Prop({ required: false })
  deliveredAt!: string;

  @Prop({ required: false })
  cancelledAt!: Date;

  @Prop({ required: false, unique: true, sparse: true })
  externalOrderId!: string;

  @Prop({
    type: String,
    enum: ['pending', 'paid', 'delivered', 'cancelled'],
    default: 'pending',
  })
  status!: string;

  @Prop({ required: false })
  statusReason!: string;

  @Prop({
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    // Removed TTL index - we handle expiration manually via cron job
  })
  stockReservationExpires!: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
