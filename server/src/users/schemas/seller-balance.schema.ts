import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Order } from '../../orders/schemas/order.schema';

export type SellerBalanceDocument = SellerBalance & Document;

@Schema({ timestamps: true })
export class SellerBalance {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    unique: true,
  })
  seller!: User;

  @Prop({ required: true, default: 0 })
  totalBalance!: number; // მთლიანი ბალანსი

  @Prop({ required: true, default: 0 })
  totalEarnings!: number; // მთლიანი შემოსავალი (ყველა შეკვეთიდან)

  @Prop({ required: true, default: 0 })
  pendingWithdrawals!: number; // გატანისთვის მოთხოვნილი თანხა

  @Prop({ required: true, default: 0 })
  totalWithdrawn!: number; // მთლიანი გატანილი თანხა
}

export const SellerBalanceSchema = SchemaFactory.createForClass(SellerBalance);

// ტრანზაქციების ისტორია
@Schema({ timestamps: true })
export class BalanceTransaction {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  })
  seller!: User;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Order',
  })
  order!: Order;

  @Prop({ required: true })
  amount!: number; // ტრანზაქციის თანხა

  @Prop({ required: true })
  type!: string; // 'earning' | 'withdrawal' | 'commission_deduction'

  @Prop({ required: true })
  description!: string; // ტრანზაქციის აღწერა

  @Prop({ required: false })
  commissionPercentage?: number; // საკომისიო პროცენტი

  @Prop({ required: false })
  commissionAmount?: number; // საკომისიო თანხა

  @Prop({ required: false })
  deliveryCommissionAmount?: number; // მიტანის საკომისიო

  @Prop({ required: false })
  productPrice?: number; // პროდუქტის ფასი

  @Prop({ required: false })
  finalAmount?: number; // საბოლოო თანხა ბალანსზე
}

export type BalanceTransactionDocument = BalanceTransaction & Document;
export const BalanceTransactionSchema =
  SchemaFactory.createForClass(BalanceTransaction);
