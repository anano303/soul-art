import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { OrderItem, PaymentResult, ShippingDetails } from 'src/interfaces';
import { User } from 'src/users/schemas/user.schema';

export type OrderDocument = Order & mongoose.Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User' })
  user?: User;

  // Guest checkout information (when user is not authenticated)
  @Prop({
    required: false,
    type: {
      email: { required: true, type: String },
      phoneNumber: { required: true, type: String },
      fullName: { required: true, type: String },
    },
  })
  guestInfo?: {
    email: string;
    phoneNumber: string;
    fullName: string;
  };

  @Prop({ default: false })
  isGuestOrder!: boolean;

  // Order type: regular (product orders) or auction (auction winner orders)
  @Prop({
    type: String,
    enum: ['regular', 'auction'],
    default: 'regular',
  })
  orderType!: string;

  // Auction reference (only for auction orders)
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction',
    required: false,
  })
  auctionId?: mongoose.Types.ObjectId;

  @Prop({
    required: true,
    type: [
      {
        name: { required: true, type: String },
        nameEn: { required: false, type: String },
        qty: { required: true, type: Number },
        image: { required: true, type: String },
        price: { required: true, type: Number },
        originalPrice: { required: false, type: Number }, // Price before any discounts
        size: { required: false, type: String },
        color: { required: false, type: String },
        ageGroup: { required: false, type: String },
        // Referral/Campaign discount fields
        referralDiscountPercent: { required: false, type: Number, default: 0 },
        referralDiscountAmount: { required: false, type: Number, default: 0 },
        hasReferralDiscount: { required: false, type: Boolean, default: false },
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
      id: { required: false, type: String },
      status: { required: false, type: String },
      update_time: { required: false, type: String },
      email_address: { required: false, type: String },
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

  // Sales Manager referral code (from cookie)
  @Prop({ type: String, default: null })
  salesRefCode?: string;

  // Campaign/Referral discount tracking
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null,
  })
  campaignId?: mongoose.Types.ObjectId;

  @Prop({ type: String, default: null })
  campaignName?: string;

  @Prop({ type: Number, default: 0 })
  totalReferralDiscount?: number; // Total discount from referral/campaign

  @Prop({ type: Boolean, default: false })
  hasReferralDiscount?: boolean; // Quick flag to identify referral orders
}

export const OrderSchema = SchemaFactory.createForClass(Order);
