import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatLogDocument = ChatLog & Document;

@Schema({ timestamps: true })
export class ChatLog {
  @Prop({ required: true })
  sessionId: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop()
  userIp?: string;

  @Prop({ required: true, enum: ['user', 'assistant'] })
  role: 'user' | 'assistant';

  @Prop({ required: true })
  message: string;

  @Prop({ type: [String], default: [] })
  productIds?: string[]; // თუ AI-მ პროდუქტები დააბრუნა

  @Prop()
  responseTime?: number; // რამდენ მილიწამში უპასუხა AI-მ

  @Prop()
  userAgent?: string;

  @Prop({ default: 'ka' })
  language?: string;
}

export const ChatLogSchema = SchemaFactory.createForClass(ChatLog);

// ინდექსები ძიებისთვის
ChatLogSchema.index({ sessionId: 1, createdAt: 1 });
ChatLogSchema.index({ userId: 1 });
ChatLogSchema.index({ createdAt: -1 });
ChatLogSchema.index({ message: 'text' }); // ტექსტური ძიებისთვის
