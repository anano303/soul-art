import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Banner extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  titleEn: string;

  @Prop({ required: true })
  buttonText: string;

  @Prop({ required: true })
  buttonTextEn: string;

  @Prop({ required: true })
  buttonLink: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
