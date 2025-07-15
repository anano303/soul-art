import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import { Category } from './category.schema';
import { ApiProperty } from '@nestjs/swagger';

export type SubCategoryDocument = HydratedDocument<SubCategory>;

@Schema({ timestamps: true })
export class SubCategory {
  @ApiProperty({
    description: 'Subcategory ID (auto-generated)',
    example: '60d21b4667d0d8992e610c86',
  })
  id: string;

  @ApiProperty({ description: 'Subcategory name', example: 'მაისურები' })
  @Prop({
    required: true,
  })
  name: string;

  @ApiProperty({
    description: 'Subcategory name in English',
    example: 'T-shirts',
  })
  @Prop({ required: false })
  nameEn?: string;

  @ApiProperty({
    description: 'Parent category',
    example: '60d21b4667d0d8992e610c85',
  })
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  })
  categoryId: Category;

  @ApiProperty({
    description: 'Available age groups',
    example: ['ბავშვები', 'მოზრდილები'],
  })
  @Prop({ type: [String], default: [] })
  ageGroups: string[];

  @ApiProperty({
    description: 'Available sizes',
    example: ['S', 'M', 'L', 'XL'],
  })
  @Prop({ type: [String], default: [] })
  sizes: string[];

  @ApiProperty({
    description: 'Available colors',
    example: ['შავი', 'თეთრი', 'წითელი'],
  })
  @Prop({ type: [String], default: [] })
  colors: string[];

  @ApiProperty({
    description: 'Subcategory description',
    example: 'მაისურები ყველა სეზონისთვის',
  })
  @Prop({ required: false })
  description?: string;

  @ApiProperty({
    description: 'Subcategory description in English',
    example: 'T-shirts for all seasons',
  })
  @Prop({ required: false })
  descriptionEn?: string;

  @ApiProperty({ description: 'Is subcategory active', default: true })
  @Prop({ default: true })
  isActive: boolean;
}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);

// Create compound index for unique subcategories within a category
SubCategorySchema.index({ name: 1, categoryId: 1 }, { unique: true });

// Ensure the virtual id field is properly included in serialization
SubCategorySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
