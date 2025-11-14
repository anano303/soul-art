import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PortfolioPost } from './portfolio-post.schema';

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret.__v;
      ret.createdAt = ret.createdAt;
    },
  },
})
export class GalleryLike {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  artistId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: PortfolioPost.name, required: true })
  portfolioPostId: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  imageIndex?: number;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', default: null })
  productId?: Types.ObjectId | null;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export type GalleryLikeDocument = GalleryLike & Document;
export const GalleryLikeSchema = SchemaFactory.createForClass(GalleryLike);

// Create compound index for efficient queries
GalleryLikeSchema.index(
  { userId: 1, portfolioPostId: 1, imageIndex: 1 },
  { unique: true },
);
GalleryLikeSchema.index({ artistId: 1, portfolioPostId: 1 });
GalleryLikeSchema.index({ portfolioPostId: 1 });