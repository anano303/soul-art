import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type SizeDocument = HydratedDocument<Size>;

@Schema({ timestamps: true })
export class Size {
  @ApiProperty({
    description: 'Size ID (auto-generated)',
    example: '60d21b4667d0d8992e610c87',
  })
  _id: string;

  @ApiProperty({ description: 'Size value', example: 'XL' })
  @Prop({
    required: true,
    unique: true,
  })
  value: string;

  @ApiProperty({
    description: 'Size category (e.g., CLOTHING, FOOTWEAR)',
    example: 'CLOTHING',
  })
  @Prop()
  category?: string;

  @ApiProperty({ description: 'Size description', example: 'Extra Large' })
  @Prop()
  description?: string;

  @ApiProperty({ description: 'Is size active', default: true })
  @Prop({ default: true })
  isActive: boolean;
}

export const SizeSchema = SchemaFactory.createForClass(Size);
