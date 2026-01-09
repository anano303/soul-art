import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type SalesTrackingDocument = SalesTracking & Document;

export enum TrackingEventType {
  VISIT = 'VISIT', // ვიზიტი საიტზე
  REGISTRATION = 'REGISTRATION', // რეგისტრაცია
  ADD_TO_CART = 'ADD_TO_CART', // კალათაში დამატება
  CHECKOUT_START = 'CHECKOUT_START', // checkout-ის დაწყება
  PURCHASE = 'PURCHASE', // შეკვეთის განხორციელება
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
export class SalesTracking {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  salesManager: User; // Sales Manager ვისი ლინკითაც შემოვიდა

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  salesRefCode: string; // რეფერალური კოდი

  @Prop({
    type: String,
    enum: TrackingEventType,
    required: true,
    index: true,
  })
  eventType: TrackingEventType;

  @Prop({
    type: String,
    required: false,
  })
  visitorId?: string; // უნიკალური ვიზიტორის ID (fingerprint ან session)

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
  })
  user?: User; // თუ დარეგისტრირებული მომხმარებელია

  @Prop({
    type: String,
    required: false,
  })
  email?: string; // email თუ ცნობილია

  @Prop({
    type: Types.ObjectId,
    ref: 'Order',
    required: false,
  })
  orderId?: Types.ObjectId; // შეკვეთის ID (PURCHASE ივენტისთვის)

  @Prop({
    type: Number,
    required: false,
  })
  orderAmount?: number; // შეკვეთის თანხა

  @Prop({
    type: String,
    required: false,
  })
  productId?: string; // პროდუქტის ID (ADD_TO_CART ივენტისთვის)

  @Prop({
    type: String,
    required: false,
  })
  userAgent?: string;

  @Prop({
    type: String,
    required: false,
  })
  ipAddress?: string;

  @Prop({
    type: String,
    required: false,
  })
  referrerUrl?: string; // საიდან მოვიდა

  @Prop({
    type: String,
    required: false,
  })
  landingPage?: string; // რომელ გვერდზე მოვიდა

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const SalesTrackingSchema = SchemaFactory.createForClass(SalesTracking);

// Compound indexes for efficient queries
SalesTrackingSchema.index({ salesManager: 1, createdAt: -1 });
SalesTrackingSchema.index({ salesRefCode: 1, eventType: 1 });
SalesTrackingSchema.index({ visitorId: 1, salesRefCode: 1 });
