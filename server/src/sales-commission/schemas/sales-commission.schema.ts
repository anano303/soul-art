import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Order } from '../../orders/schemas/order.schema';

export enum CommissionStatus {
  PENDING = 'PENDING', // შეკვეთა გადახდილია, კომისია მოლოდინში
  APPROVED = 'APPROVED', // შეკვეთა მიტანილია, კომისია დამტკიცებული
  PAID = 'PAID', // კომისია გადახდილი
  CANCELLED = 'CANCELLED', // შეკვეთა გაუქმებულია
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
export class SalesCommission {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  salesManager: User; // Sales Manager ვინც მიიღებს კომისიას

  @Prop({
    type: Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true,
  })
  order: Order; // შეკვეთა რომელზეც კომისია დაირიცხა

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
  })
  customer?: User; // მყიდველი (თუ დარეგისტრირებულია)

  @Prop({
    type: String,
    required: false,
  })
  guestEmail?: string; // სტუმრის email (თუ guest checkout)

  @Prop({
    type: String,
    required: true,
  })
  salesRefCode: string; // Sales Manager-ის რეფერალური კოდი

  @Prop({
    type: Number,
    required: true,
  })
  orderTotal: number; // შეკვეთის ჯამური თანხა

  @Prop({
    type: Number,
    required: true,
    default: 5, // 5% კომისია
  })
  commissionPercent: number;

  @Prop({
    type: Number,
    required: true,
  })
  commissionAmount: number; // კომისიის თანხა ლარებში

  @Prop({
    type: String,
    enum: CommissionStatus,
    default: CommissionStatus.PENDING,
    index: true,
  })
  status: CommissionStatus;

  @Prop({
    type: Date,
    default: null,
  })
  approvedAt?: Date; // როდის დამტკიცდა (შეკვეთა მიტანილია)

  @Prop({
    type: Date,
    default: null,
  })
  paidAt?: Date; // როდის გადაეცა კომისია

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export type SalesCommissionDocument = SalesCommission & Document;
export const SalesCommissionSchema =
  SchemaFactory.createForClass(SalesCommission);

// ინდექსები ოპტიმიზაციისთვის
SalesCommissionSchema.index({ salesManager: 1, status: 1 });
SalesCommissionSchema.index({ order: 1 }, { unique: true }); // ერთ შეკვეთაზე მხოლოდ ერთი კომისია
SalesCommissionSchema.index({ createdAt: -1 });
