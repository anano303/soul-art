import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ExchangeRateDocument = ExchangeRate & Document;

@Schema({ timestamps: true })
export class ExchangeRate {
  @Prop({ required: true, unique: true })
  currency: string; // 'USD' or 'EUR'

  @Prop({ required: true })
  rate: number; // How many of this currency = 1 GEL (e.g., 0.37 means 1 GEL = 0.37 USD)

  @Prop({ required: true })
  date: Date; // Date when this rate was fetched

  @Prop()
  source: string; // 'NBG' (National Bank of Georgia)
}

export const ExchangeRateSchema = SchemaFactory.createForClass(ExchangeRate);

// Index for efficient queries
ExchangeRateSchema.index({ currency: 1, date: -1 });
