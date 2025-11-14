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
export class GalleryComment {
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

  @Prop({ required: true, maxlength: 500 })
  comment: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export type GalleryCommentDocument = GalleryComment & Document;
export const GalleryCommentSchema = SchemaFactory.createForClass(GalleryComment);

// Create indexes for efficient queries
GalleryCommentSchema.index({ artistId: 1, portfolioPostId: 1, createdAt: -1 });
GalleryCommentSchema.index({ userId: 1 });
GalleryCommentSchema.index({ portfolioPostId: 1, createdAt: -1 });