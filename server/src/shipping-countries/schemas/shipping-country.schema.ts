import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShippingCountryDocument = ShippingCountry & Document;

@Schema({ timestamps: true })
export class ShippingCountry {
  @Prop({ required: true, unique: true })
  countryCode: string; // e.g., "GE", "IT", "US"

  @Prop({ required: true })
  countryName: string; // e.g., "საქართველო", "Italy", "United States"

  @Prop({ required: true, default: 0 })
  cost: number; // Shipping cost in GEL

  @Prop({ default: false })
  isFree: boolean; // Whether shipping is free

  @Prop({ default: true })
  isActive: boolean; // Whether this country is currently available for shipping
}

export const ShippingCountrySchema = SchemaFactory.createForClass(ShippingCountry);
