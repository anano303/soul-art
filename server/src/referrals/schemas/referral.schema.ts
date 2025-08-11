import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export enum ReferralStatus {
  PENDING = 'PENDING', // მოწვეული დარეგისტრირდა
  PRODUCTS_UPLOADED = 'PRODUCTS_UPLOADED', // მინიმუმ 5 პროდუქტი ატვირთა
  APPROVED = 'APPROVED', // ადმინმა დაამტკიცა და ბონუსი გადაეცა
  REJECTED = 'REJECTED', // ადმინმა უარყო
}

export enum ReferralType {
  SELLER = 'SELLER', // სელერის მოწვევა (5 ლარი)
  USER = 'USER', // ჩვეულებრივი მომხმარებლის მოწვევა (20 თეთრი)
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
export class Referral {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  referrer: User; // ვინც მოიწვია

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  referred: User; // ვინც მოწვეულია

  @Prop({
    type: String,
    enum: ReferralType,
    required: true,
  })
  type: ReferralType;

  @Prop({
    type: String,
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  @Prop({
    type: Number,
    required: true,
  })
  bonusAmount: number; // ბონუსის ოდენობა ლარებში

  @Prop({
    type: Date,
    default: null,
  })
  approvedAt?: Date; // როდის დამტკიცდა

  @Prop({
    type: Date,
    default: null,
  })
  paidAt?: Date; // როდის გადაეცა ბონუსი

  @Prop({
    type: String,
    default: null,
  })
  rejectionReason?: string; // უარყოფის მიზეზი

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export type ReferralDocument = Referral & Document;
export const ReferralSchema = SchemaFactory.createForClass(Referral);

// ინდექსები ოპტიმიზაციისთვის
ReferralSchema.index({ referrer: 1, status: 1 });
ReferralSchema.index({ referred: 1 });
ReferralSchema.index({ createdAt: -1 });

// ერთი მომხმარებელი მხოლოდ ერთხელ უნდა დარეგისტრირდეს რეფერალური კოდით
ReferralSchema.index({ referred: 1 }, { unique: true });
