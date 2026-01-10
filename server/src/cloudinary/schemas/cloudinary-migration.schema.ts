import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CloudinaryMigrationDocument = CloudinaryMigration & Document;

export enum MigrationStatus {
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export interface MigrationError {
  url: string;
  error: string;
  timestamp: Date;
}

/**
 * Tracks Cloudinary migration progress
 * Allows resumable migrations and progress tracking
 */
@Schema({ timestamps: true, collection: 'cloudinary_migrations' })
export class CloudinaryMigration {
  @Prop({ required: true })
  fromClouds: string[]; // Array of old cloud names being migrated from

  @Prop({ required: true })
  toCloud: string;

  @Prop({
    required: true,
    enum: MigrationStatus,
    default: MigrationStatus.InProgress,
  })
  status: MigrationStatus;

  @Prop({ default: 0 })
  totalUrls: number;

  @Prop({ default: 0 })
  copiedUrls: number;

  @Prop({ default: 0 })
  failedUrls: number;

  @Prop({ default: 0 })
  skippedUrls: number;

  @Prop({
    type: [{ url: String, error: String, timestamp: Date }],
    default: [],
  })
  migrationErrors: MigrationError[];

  @Prop({ required: true })
  startedAt: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancelReason?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CloudinaryMigrationSchema =
  SchemaFactory.createForClass(CloudinaryMigration);
