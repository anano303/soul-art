import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import * as mongoose from 'mongoose';

export type EtsyFeePaymentDocument = HydratedDocument<EtsyFeePayment>;

// Card (BOG) payment of the Etsy listing fee. Created when the seller
// chooses to pay by card instead of balance; the BOG callback flips the
// status and triggers the actual publish.
@Schema({ timestamps: true })
export class EtsyFeePayment {
  @Prop({ required: true, unique: true })
  externalOrderId!: string; // etsy_<uuid>, matched in the BOG callback

  // BOG's own order id — lets us verify the payment status directly with
  // BOG when a callback never arrived (e.g. local testing, outages)
  @Prop()
  bogOrderId?: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  })
  product!: Types.ObjectId;

  // Product owner — the listing is published on their behalf
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  seller!: Types.ObjectId;

  @Prop({ required: true })
  amountGel!: number;

  // Role of the user who initiated the payment (seller | admin)
  @Prop()
  payerRole?: string;

  // pending → paid → published | publish_failed
  // also: failed (BOG order creation failed) | expired (abandoned checkout)
  @Prop({ default: 'pending' })
  status!: string;

  @Prop()
  listingId?: string;

  @Prop()
  error?: string;
}

export const EtsyFeePaymentSchema =
  SchemaFactory.createForClass(EtsyFeePayment);
