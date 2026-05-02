import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Document } from 'mongoose';

export type VoucherDocument = Voucher & Document;

@Schema({ timestamps: true })
export class Voucher {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, enum: [100, 200, 500], min: 1 })
  amount: number;

  @Prop({ required: true, enum: ['GEL', 'USD', 'EUR'] })
  currency: string;

  // Optional: assign to specific user (null = any user can use it)
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
  assignedTo: mongoose.Types.ObjectId | null;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
  usedBy: mongoose.Types.ObjectId | null;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null })
  usedInOrder: mongoose.Types.ObjectId | null;

  @Prop({ default: null })
  usedAt: Date | null;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);
VoucherSchema.index({ code: 1 }, { unique: true });
VoucherSchema.index({ expiresAt: 1 });
VoucherSchema.index({ isUsed: 1, isActive: 1 });
