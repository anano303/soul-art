import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Product } from '@/products/schemas/product.schema';
import { User } from './user.schema';

@Schema({ _id: false })
export class PortfolioImage {
  @Prop({ required: true })
  url: string;

  @Prop({ type: Number, default: 0 })
  order?: number;

  @Prop({ type: String, default: null })
  sourceProductImageId?: string | null;

  @Prop({ type: String, default: null })
  storageProvider?: string | null;

  @Prop({ type: Map, of: String, default: undefined })
  metadata?: Record<string, string> | undefined;
}

export const PortfolioImageSchema =
  SchemaFactory.createForClass(PortfolioImage);

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret.__v;
    },
  },
})
export class PortfolioPost {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  artistId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Product.name, default: null })
  productId?: Types.ObjectId | null;

  @Prop({ type: [PortfolioImageSchema], default: [] })
  images: PortfolioImage[];

  @Prop({ type: String, default: null, maxlength: 4000 })
  caption?: string | null;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ type: Boolean, default: false })
  isFeatured?: boolean;

  @Prop({ type: Boolean, default: false })
  isSold?: boolean;

  @Prop({ type: Boolean, default: false })
  hideBuyButton?: boolean;

  @Prop({ type: Number, default: 0 })
  likesCount?: number;

  @Prop({ type: Number, default: 0 })
  commentsCount?: number;

  @Prop({ type: Date, default: Date.now })
  publishedAt?: Date;

  @Prop({ type: Date, default: null })
  archivedAt?: Date | null;
}

export type PortfolioPostDocument = PortfolioPost & Document;
export const PortfolioPostSchema = SchemaFactory.createForClass(PortfolioPost);

PortfolioPostSchema.index({ artistId: 1, createdAt: -1 });
PortfolioPostSchema.index({ productId: 1 }, { unique: true, sparse: true });
PortfolioPostSchema.index({ artistId: 1, isFeatured: 1 });
PortfolioPostSchema.index({ publishedAt: -1, archivedAt: 1 }); // For explore feed
PortfolioPostSchema.index({ caption: 'text', tags: 'text' }); // For search
