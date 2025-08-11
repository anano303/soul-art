import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '@/types/role.enum';

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret.__v;
      delete ret.password;
      ret.createdAt = ret.createdAt;
    },
  },
})
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: String })
  password: string;

  @Prop({ type: String, enum: Role, default: Role.User })
  role: Role;
  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  @Prop({ type: String, default: null })
  refreshToken?: string | null;

  // 👇 **ეს ველები მხოლოდ Seller-ს დასჭირდება, ამიტომ `required: false` ვუტოვებთ**
  @Prop({ type: String, default: null })
  storeName?: string;

  @Prop({ type: String, default: null })
  storeLogo?: string;

  @Prop({ type: String, default: null })
  storeLogoPath?: string;

  @Prop({ type: String, default: null })
  ownerFirstName?: string;

  @Prop({ type: String, default: null })
  ownerLastName?: string;

  @Prop({ type: String, default: null })
  phoneNumber?: string;

  @Prop({ type: String, default: null })
  identificationNumber?: string;

  @Prop({ type: String, default: null })
  accountNumber?: string;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop({ type: String, default: null })
  profileImagePath: string;

  // სელერის ბალანსი
  @Prop({ type: Number, default: 0 })
  balance?: number;

  // რეფერალების სისტემა
  @Prop({ type: String, unique: true, sparse: true })
  referralCode?: string; // უნიკალური რეფერალური კოდი

  @Prop({ type: String, default: null })
  referredBy?: string; // ვისი რეფერალური კოდით დარეგისტრირდა

  @Prop({ type: Date, default: null })
  sellerApprovedAt?: Date; // როდის დამტკიცდა სელერად

  @Prop({ type: Number, default: 0 })
  totalReferrals?: number; // მოწვეული სელერების რაოდენობა

  @Prop({ type: Number, default: 0 })
  totalEarnings?: number; // მიღებული ბონუსების ჯამი

  @Prop({ type: Number, default: 0 })
  monthlyWithdrawals?: number; // ამ თვეში გატანილი თანხების რაოდენობა

  @Prop({ type: Date, default: null })
  lastWithdrawalReset?: Date; // ბოლო თვიური რესეტის თარიღი
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', function (next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});
