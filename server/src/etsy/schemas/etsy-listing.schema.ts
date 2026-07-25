import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import * as mongoose from 'mongoose';

export type EtsyListingDocument = HydratedDocument<EtsyListing>;

// One record per SoulArt product pushed to the platform's Etsy shop.
@Schema({ timestamps: true })
export class EtsyListing {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  })
  product!: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  seller!: Types.ObjectId;

  @Prop({ required: true })
  listingId!: string; // Etsy listing_id

  @Prop()
  listingUrl?: string;

  // draft | active | inactive | removed
  @Prop({ default: 'draft' })
  state!: string;

  @Prop()
  priceGel?: number; // seller's price at publish time

  @Prop()
  priceUsd?: number; // final Etsy price (commission included, converted)

  @Prop()
  commissionPercent?: number;

  @Prop()
  listingFeeGel?: number;

  @Prop({ default: false })
  feeCharged!: boolean;

  @Prop()
  taxonomyId?: number;

  @Prop({ default: 0 })
  imagesUploaded?: number;

  @Prop({ type: [String], default: [] })
  warnings?: string[];
}

export const EtsyListingSchema = SchemaFactory.createForClass(EtsyListing);

EtsyListingSchema.index({ product: 1, state: 1 });
