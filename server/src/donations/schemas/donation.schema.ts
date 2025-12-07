import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DonationDocument = Donation & Document;

export enum DonationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Schema({ timestamps: true })
export class Donation {
  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 'GEL' })
  currency: string;

  @Prop({ required: true })
  donorName: string;

  @Prop({ required: false })
  donorEmail: string;

  @Prop({ required: false })
  message: string;

  @Prop({ required: false, default: false })
  isAnonymous: boolean;

  @Prop({ required: false, default: true })
  showInSponsors: boolean;

  @Prop({
    type: String,
    enum: DonationStatus,
    default: DonationStatus.PENDING,
  })
  status: DonationStatus;

  @Prop({ required: false })
  externalOrderId: string;

  @Prop({ required: false })
  bogOrderId: string;

  @Prop({ type: Object, required: false })
  paymentResult: {
    id: string;
    status: string;
    update_time: string;
    payer?: {
      email_address?: string;
    };
  };

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  @Prop({ required: false })
  ipAddress: string;

  @Prop({ required: false })
  userAgent: string;

  createdAt: Date;
  updatedAt: Date;
}

export const DonationSchema = SchemaFactory.createForClass(Donation);

// Indexes for efficient queries
DonationSchema.index({ status: 1, createdAt: -1 });
DonationSchema.index({ externalOrderId: 1 });
DonationSchema.index({ bogOrderId: 1 });
DonationSchema.index({ donorEmail: 1 });
