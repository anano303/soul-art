import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Visitor extends Document {
  @Prop({ required: true })
  ip: string;

  @Prop()
  userAgent: string;

  @Prop()
  page: string;

  @Prop()
  referrer: string;

  @Prop()
  device: string; // mobile, desktop, tablet

  @Prop()
  browser: string;

  @Prop()
  os: string;

  @Prop()
  country: string;

  @Prop()
  city: string;

  @Prop()
  userId?: string; // If logged in

  @Prop()
  sessionId: string;

  @Prop({ default: Date.now })
  lastActivity: Date;

  @Prop({ default: 1 })
  pageViews: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const VisitorSchema = SchemaFactory.createForClass(Visitor);

// Index for faster queries
VisitorSchema.index({ sessionId: 1 });
VisitorSchema.index({ ip: 1 });
VisitorSchema.index({ isActive: 1, lastActivity: -1 });
VisitorSchema.index({ createdAt: -1 });
