import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export enum TransactionType {
  REFERRAL_BONUS = 'REFERRAL_BONUS', // რეფერალური ბონუსი
  WITHDRAWAL = 'WITHDRAWAL', // ბალანსის გატანა
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT', // ადმინის კორექტირება
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
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
export class BalanceTransaction {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user: User;

  @Prop({
    type: String,
    enum: TransactionType,
    required: true,
  })
  type: TransactionType;

  @Prop({
    type: Number,
    required: true,
  })
  amount: number; // ლარებში (დადებითი - შემოსავალი, უარყოფითი - ხარჯი)

  @Prop({
    type: Number,
    required: true,
  })
  balanceBefore: number; // ბალანსი ტრანზაქციამდე

  @Prop({
    type: Number,
    required: true,
  })
  balanceAfter: number; // ბალანსი ტრანზაქციის შემდეგ

  @Prop({
    type: String,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Prop({
    type: String,
  })
  description?: string; // ტრანზაქციის აღწერა

  @Prop({
    type: Types.ObjectId,
    ref: 'Referral',
    default: null,
  })
  referralId?: string; // თუ რეფერალური ბონუსია

  @Prop({
    type: String,
    default: null,
  })
  withdrawalMethod?: string; // "bank" ან "paybox"

  @Prop({
    type: String,
    default: null,
  })
  withdrawalDetails?: string; // ბანკის ან პეიბოქსის დეტალები

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export type BalanceTransactionDocument = BalanceTransaction & Document;
export const BalanceTransactionSchema =
  SchemaFactory.createForClass(BalanceTransaction);

// ინდექსები
BalanceTransactionSchema.index({ user: 1, createdAt: -1 });
BalanceTransactionSchema.index({ type: 1, status: 1 });
BalanceTransactionSchema.index({ referralId: 1 });
