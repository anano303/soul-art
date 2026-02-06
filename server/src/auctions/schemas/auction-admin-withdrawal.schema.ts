import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum AuctionAdminWithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
}

export type AuctionAdminWithdrawalDocument = AuctionAdminWithdrawal & Document;

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
export class AuctionAdminWithdrawal {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  auctionAdminId: Types.ObjectId;

  @Prop({
    type: Number,
    required: true,
    min: 50, // Minimum 50 GEL
  })
  amount: number;

  // Bank account details
  @Prop({ type: String, required: true })
  accountNumber: string;

  @Prop({ type: String, required: true })
  accountHolderName: string;

  @Prop({ type: String, required: true })
  identificationNumber: string; // Personal ID number

  @Prop({ type: String, default: null })
  bankName?: string;

  @Prop({ type: String, default: null })
  beneficiaryBankCode?: string; // SWIFT/BIC code

  @Prop({
    type: String,
    enum: AuctionAdminWithdrawalStatus,
    default: AuctionAdminWithdrawalStatus.PENDING,
  })
  status: AuctionAdminWithdrawalStatus;

  @Prop({ type: String, default: null })
  rejectionReason?: string;

  @Prop({ type: Date, default: null })
  processedAt?: Date;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  processedBy?: Types.ObjectId; // Which admin processed this

  @Prop({ type: String, default: null })
  transactionId?: string; // Bank transaction ID

  // Earnings included in this withdrawal
  @Prop({
    type: [{ type: Types.ObjectId, ref: 'AuctionAdminEarnings' }],
    default: [],
  })
  earningsIncluded: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

export const AuctionAdminWithdrawalSchema =
  SchemaFactory.createForClass(AuctionAdminWithdrawal);

// Indexes
AuctionAdminWithdrawalSchema.index({ auctionAdminId: 1, status: 1 });
AuctionAdminWithdrawalSchema.index({ createdAt: -1 });
AuctionAdminWithdrawalSchema.index({ status: 1 });
