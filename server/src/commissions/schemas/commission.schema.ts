import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '@/users/schemas/user.schema';

// Commission type / style the buyer requests.
export enum CommissionType {
  Portrait = 'portrait',
  Caricature = 'caricature',
  Copy = 'copy',
  Pet = 'pet',
  Digital = 'digital',
  Other = 'other',
}

export enum CommissionStatus {
  Open = 'open', // within the 24h offer window, artists can bid
  Selecting = 'selecting', // an offer was picked, awaiting payment
  Paid = 'paid', // buyer paid, artist working (escrow held)
  InProgress = 'in_progress', // optional working state
  Completed = 'completed', // delivered + escrow released to artist
  Cancelled = 'cancelled',
  Expired = 'expired', // no offers / no selection in time
}

export type CommissionDocument = Commission & Document;

// A single artist's competing offer (embedded).
@Schema({ _id: true, timestamps: false })
export class CommissionOffer {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  artist!: User;

  @Prop()
  artistName?: string;

  @Prop({ required: true })
  price!: number;

  @Prop({ required: true, default: 0 })
  deliveryPrice!: number;

  @Prop({ required: true })
  estimatedDays!: number;

  @Prop()
  message?: string;

  @Prop({ default: () => new Date() })
  createdAt!: Date;
}
export const CommissionOfferSchema =
  SchemaFactory.createForClass(CommissionOffer);

@Schema({ timestamps: true })
export class Commission {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  requester!: User;

  // If set, this is a direct request to ONE artist (from their profile page);
  // only that artist is notified and can offer.
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  })
  targetArtist?: mongoose.Types.ObjectId | null;

  // Buyer contact — ADMIN ONLY, never exposed to artists.
  @Prop()
  requesterName?: string;

  @Prop()
  requesterEmail?: string;

  @Prop()
  requesterPhone?: string;

  @Prop({
    type: String,
    enum: CommissionType,
    required: true,
    index: true,
  })
  type!: CommissionType;

  @Prop({ type: [String], default: [] })
  referenceImages!: string[];

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  size!: string;

  @Prop()
  material?: string;

  @Prop()
  budget?: number;

  // Shipping — ADMIN ONLY (SoulArt handles delivery).
  @Prop({
    type: {
      address: { type: String },
      city: { type: String },
      postalCode: { type: String },
      country: { type: String },
      phoneNumber: { type: String },
    },
  })
  shippingDetails?: {
    address: string;
    city: string;
    postalCode?: string;
    country: string;
    phoneNumber?: string;
  };

  @Prop()
  desiredDueDate?: Date;

  @Prop({
    type: String,
    enum: CommissionStatus,
    default: CommissionStatus.Open,
    index: true,
  })
  status!: CommissionStatus;

  // Artists may offer until this moment (createdAt + 24h).
  @Prop({ required: true })
  offersDeadline!: Date;

  // Buyer must pick + pay before this (offersDeadline + 24h).
  @Prop({ required: true })
  selectionDeadline!: Date;

  @Prop({ type: [CommissionOfferSchema], default: [] })
  offers!: CommissionOffer[];

  @Prop({
    type: {
      artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      artistName: { type: String },
      price: { type: Number },
      deliveryPrice: { type: Number },
      estimatedDays: { type: Number },
      totalPrice: { type: Number },
    },
  })
  selectedOffer?: {
    artist: mongoose.Types.ObjectId;
    artistName?: string;
    price: number;
    deliveryPrice: number;
    estimatedDays: number;
    totalPrice: number;
  };

  // ── Payment (BOG) — mirrors the auction flow ──
  @Prop({ index: true })
  externalOrderId?: string;

  @Prop({ default: false })
  isPaid!: boolean;

  @Prop()
  paidAt?: Date;

  @Prop({
    type: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
    },
  })
  paymentResult?: {
    id?: string;
    status?: string;
    update_time?: string;
  };

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  })
  orderId?: mongoose.Types.ObjectId;

  @Prop()
  completedAt?: Date;
}

export const CommissionSchema = SchemaFactory.createForClass(Commission);

CommissionSchema.index({ status: 1, offersDeadline: 1 });
CommissionSchema.index({ 'offers.artist': 1 });
