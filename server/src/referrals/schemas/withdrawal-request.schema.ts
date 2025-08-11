import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
}

export enum WithdrawalMethod {
  BANK = 'BANK',
  PAYBOX = 'PAYBOX',
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
export class WithdrawalRequest {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user: User;

  @Prop({
    type: Number,
    required: true,
    min: 50, // მინიმუმ 50 ლარი
  })
  amount: number;

  @Prop({
    type: String,
    enum: WithdrawalMethod,
    required: true,
  })
  method: WithdrawalMethod;

  @Prop({
    type: String,
    required: true,
  })
  accountDetails: string; // ბანკის ანგარიში ან პეიბოქსის მისამართი

  @Prop({
    type: String,
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @Prop({
    type: String,
    default: null,
  })
  rejectionReason?: string;

  @Prop({
    type: Date,
    default: null,
  })
  processedAt?: Date;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  processedBy?: User; // რომელმა ადმინმა დაამუშავა

  @Prop({
    type: String,
    default: null,
  })
  transactionId?: string; // ბანკის ტრანზაქციის ID

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export type WithdrawalRequestDocument = WithdrawalRequest & Document;
export const WithdrawalRequestSchema =
  SchemaFactory.createForClass(WithdrawalRequest);

// ინდექსები
WithdrawalRequestSchema.index({ user: 1, status: 1 });
WithdrawalRequestSchema.index({ createdAt: -1 });
WithdrawalRequestSchema.index({ status: 1 });
