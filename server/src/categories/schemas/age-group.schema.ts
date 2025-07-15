import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type AgeGroupDocument = HydratedDocument<AgeGroup>;

@Schema({ timestamps: true })
export class AgeGroup {
  @ApiProperty({
    description: 'Age group ID (auto-generated)',
    example: '60d21b4667d0d8992e610c89',
  })
  _id: string;
  @ApiProperty({ description: 'Age group name', example: 'ბავშვები' })
  @Prop({
    required: true,
    unique: true,
  })
  name: string;

  @ApiProperty({
    description: 'Age group name in English',
    example: 'Children',
  })
  @Prop()
  nameEn?: string;

  @ApiProperty({ description: 'Age range description', example: '3-12 წელი' })
  @Prop()
  ageRange?: string;

  @ApiProperty({
    description: 'Age group description',
    example: 'ბავშვები 3-დან 12 წლამდე',
  })
  @Prop()
  description?: string;

  @ApiProperty({ description: 'Is age group active', default: true })
  @Prop({ default: true })
  isActive: boolean;
}

export const AgeGroupSchema = SchemaFactory.createForClass(AgeGroup);
