import { Schema, Document, Types } from 'mongoose';

export interface PushSubscription extends Document {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: Types.ObjectId;
  userEmail?: string;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  createdAt: Date;
  lastUsed: Date;
}

export const PushSubscriptionSchema = new Schema<PushSubscription>(
  {
    endpoint: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    p256dh: {
      type: String,
      required: true,
    },
    auth: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    userEmail: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
PushSubscriptionSchema.index({ isActive: 1, createdAt: -1 });
PushSubscriptionSchema.index({ userId: 1, isActive: 1 });
