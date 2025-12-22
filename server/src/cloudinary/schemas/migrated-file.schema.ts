import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MigratedFileDocument = MigratedFile & Document;

/**
 * Tracks individual files that have been migrated
 * Used to skip already-migrated files when resuming or starting new migrations
 */
@Schema({ timestamps: true, collection: 'migrated_files' })
export class MigratedFile {
  @Prop({ type: Types.ObjectId, ref: 'CloudinaryMigration' })
  migrationId?: Types.ObjectId;

  @Prop({ required: true, index: true })
  publicId: string;

  @Prop({ required: true, index: true })
  destinationCloud: string;

  @Prop({ required: true })
  sourceUrl: string;

  @Prop()
  resourceType?: string; // 'image', 'video', 'raw'

  @Prop({ required: true })
  migratedAt: Date;
}

export const MigratedFileSchema = SchemaFactory.createForClass(MigratedFile);

// Compound index for efficient lookups
MigratedFileSchema.index({ publicId: 1, destinationCloud: 1 }, { unique: true });
