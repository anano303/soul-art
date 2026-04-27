import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Banner extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  titleEn: string;

  @Prop({ default: '' })
  buttonText: string;

  @Prop({ default: '' })
  buttonTextEn: string;

  @Prop({ default: '' })
  buttonLink: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ default: 'banner', enum: ['banner', 'hero'] })
  type: string;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
