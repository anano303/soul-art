import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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

  @Prop({ required: true })
  imageUrl: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export type GalleryLikeDocument = GalleryLike & Document;
export const GalleryLikeSchema = SchemaFactory.createForClass(GalleryLike);

// Create compound index for efficient queries
GalleryLikeSchema.index({ userId: 1, artistId: 1, imageUrl: 1 }, { unique: true });
GalleryLikeSchema.index({ artistId: 1, imageUrl: 1 });