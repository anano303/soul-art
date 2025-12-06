import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '../../users/schemas/user.schema';
import { HydratedDocument } from 'mongoose';
import { Category } from '../../categories/schemas/category.schema';
import { SubCategory } from '../../categories/schemas/subcategory.schema';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Review {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    default: null,
  })
  user!: User;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  rating!: number;

  @Prop({ required: true })
  comment!: string;
}

export enum ProductStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum DeliveryType {
  SELLER = 'SELLER',
  SoulArt = 'SoulArt',
}

export enum MainCategory {
  CLOTHING = 'CLOTHING',
  ACCESSORIES = 'ACCESSORIES',
  FOOTWEAR = 'FOOTWEAR',
  SWIMWEAR = 'SWIMWEAR',
}

export enum AgeGroup {
  ADULTS = 'ADULTS',
  KIDS = 'KIDS',
}

export interface CategoryStructure {
  main: MainCategory;
  sub: string;
  subEn?: string;
  ageGroup?: AgeGroup;
  size?: string;
  color?: string;
  colorEn?: string;
}

// New variant schema for tracking inventory by size/color
@Schema()
export class ProductVariant {
  @Prop({ required: false })
  size?: string;

  @Prop({ required: false })
  color?: string;

  @Prop({ required: false })
  colorEn?: string;

  @Prop({ required: false })
  ageGroup?: string;

  @Prop({ required: true, default: 0 })
  stock: number;

  @Prop({ required: false })
  sku?: string;
}

export const ProductVariantSchema =
  SchemaFactory.createForClass(ProductVariant);

@Schema({
  timestamps: true,
  autoIndex: false, // Disable automatic index creation
})
export class Product {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    default: null,
  })
  user!: User;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: false })
  nameEn?: string;

  @Prop({ required: true })
  brand?: string;

  @Prop({})
  brandLogo?: string;

  // Legacy category field (keeping for backward compatibility)
  @Prop({ required: true })
  category!: string;

  // New category relationships
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  })
  mainCategory?: mongoose.Types.ObjectId | string;

  @Prop()
  mainCategoryEn?: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
  })
  subCategory?: mongoose.Types.ObjectId | string;

  @Prop()
  subCategoryEn?: string;

  // Product attributes based on subcategory
  @Prop({ type: [String], default: [] })
  ageGroups?: string[];

  @Prop({ type: [String], default: [] })
  sizes?: string[];

  @Prop({ type: [String], default: [] })
  colors?: string[];

  @Prop({ type: [String], default: [] })
  colorsEn?: string[];

  // Add categoryStructure field
  @Prop({ type: Object })
  categoryStructure?: CategoryStructure;

  @Prop({ required: true, type: [String], default: [] })
  images!: string[];

  @Prop({ required: true })
  description!: string;

  @Prop({ required: false })
  descriptionEn?: string;

  @Prop({ required: false })
  videoDescription?: string; // YouTube embed code or URL

  @Prop({ required: false })
  youtubeVideoId?: string;

  @Prop({ required: false })
  youtubeVideoUrl?: string;

  @Prop({ required: false })
  youtubeEmbedUrl?: string;

  // SEO hashtags for better search visibility
  @Prop({ type: [String], default: [] })
  hashtags?: string[];

  @Prop({ required: true })
  reviews!: Review[];

  @Prop({ required: true, default: 0 })
  rating!: number;

  @Prop({ required: true, default: 0 })
  numReviews!: number;

  @Prop({ required: true, default: 0 })
  price!: number;

  // Discount functionality
  @Prop({ type: Number, min: 0, max: 100 })
  discountPercentage?: number;

  @Prop({ type: Date })
  discountStartDate?: Date;

  @Prop({ type: Date })
  discountEndDate?: Date;

  // Legacy single inventory field (keeping for backward compatibility)
  @Prop({ required: true, default: 0 })
  countInStock!: number;

  // New inventory tracking by variants
  @Prop({ type: [ProductVariantSchema], default: [] })
  variants: ProductVariant[];

  @Prop({ required: true, default: ProductStatus.PENDING })
  status!: ProductStatus;

  @Prop({ type: Number, default: 0 })
  viewCount!: number;

  @Prop({ type: String })
  rejectionReason?: string;

  @Prop({ type: Date })
  firstApprovedAt?: Date;

  @Prop({ type: String, enum: DeliveryType, default: DeliveryType.SoulArt })
  deliveryType?: DeliveryType;

  @Prop({ type: Number })
  minDeliveryDays?: number;

  @Prop({ type: Number })
  maxDeliveryDays?: number;

  @Prop({ type: Object })
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };

  @Prop({ type: Boolean, default: true })
  isOriginal?: boolean;

  @Prop({ type: [String], default: [] })
  materials?: string[];

  @Prop({ type: [String], default: [] })
  materialsEn?: string[];

  // Hide from store/home pages but still visible on artist profile
  @Prop({ type: Boolean, default: false })
  hideFromStore?: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Disable automatic index creation to prevent duplicates
ProductSchema.set('autoIndex', false);

// Create indexes manually with proper configuration
// Note: autoIndex is disabled to prevent duplicate indexes

// Create composite index for efficient category-based queries
ProductSchema.index(
  { mainCategory: 1, subCategory: 1 },
  { background: true, sparse: true },
);

// Individual indexes for common queries
ProductSchema.index({ brand: 1 }, { background: true, sparse: true });
ProductSchema.index({ status: 1 }, { background: true });
// Note: createdAt index is automatically created by timestamps: true

// Array field indexes (created individually to avoid parallel array indexing)
ProductSchema.index({ ageGroups: 1 }, { background: true, sparse: true });
ProductSchema.index({ sizes: 1 }, { background: true, sparse: true });
ProductSchema.index({ colors: 1 }, { background: true, sparse: true });
