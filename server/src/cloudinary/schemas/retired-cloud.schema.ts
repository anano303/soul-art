import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RetiredCloudDocument = RetiredCloud & Document;

/**
 * Stores retired Cloudinary cloud names
 * Used by the URL interceptor to know which old cloud names to replace
 */
@Schema({ timestamps: true, collection: 'retired_clouds' })
export class RetiredCloud {
  @Prop({ required: true, unique: true })
  cloudName: string;

  @Prop({ required: true })
  retiredAt: Date;

  @Prop({ required: true })
  migratedToCloud: string;
}

export const RetiredCloudSchema = SchemaFactory.createForClass(RetiredCloud);
