import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FaqDocument = Faq & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Faq {
  @Prop({ type: String, required: true, trim: true })
  questionKa: string;

  @Prop({ type: String, trim: true })
  questionEn?: string;

  @Prop({ type: String, required: true, trim: true })
  answerKa: string;

  @Prop({ type: String, trim: true })
  answerEn?: string;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const FaqSchema = SchemaFactory.createForClass(Faq);

FaqSchema.index({ order: 1 });
FaqSchema.index({ isActive: 1 });
