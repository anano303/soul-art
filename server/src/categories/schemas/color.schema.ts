import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ColorDocument = HydratedDocument<Color>;

@Schema({ timestamps: true })
export class Color {
  @ApiProperty({
    description: 'Color ID (auto-generated)',
    example: '60d21b4667d0d8992e610c88',
  })
  _id: string;

  @ApiProperty({ description: 'Color name', example: 'წითელი' })
  @Prop({
    required: true,
    unique: true,
  })
  name: string;

  @ApiProperty({ description: 'Color name in English', example: 'Red' })
  @Prop()
  nameEn?: string;

  @ApiProperty({ description: 'Color hex code', example: '#FF0000' })
  @Prop()
  hexCode?: string;

  @ApiProperty({ description: 'Color description', example: 'მკვეთრი წითელი' })
  @Prop()
  description?: string;

  @ApiProperty({ description: 'Is color active', default: true })
  @Prop({ default: true })
  isActive: boolean;
}

export const ColorSchema = SchemaFactory.createForClass(Color);
