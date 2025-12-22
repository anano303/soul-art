import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CloudinaryConfigDocument = CloudinaryConfig & Document;

/**
 * Stores the active Cloudinary configuration
 * Only one document should exist (singleton pattern)
 */
@Schema({ timestamps: true, collection: 'cloudinary_config' })
export class CloudinaryConfig {
  @Prop({ required: true })
  cloudName: string;

  @Prop({ required: true })
  apiKey: string;

  @Prop({ required: true })
  apiSecretEncrypted: string; // AES-256 encrypted

  @Prop({ default: true })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CloudinaryConfigSchema = SchemaFactory.createForClass(CloudinaryConfig);
