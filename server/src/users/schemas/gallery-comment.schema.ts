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
export class GalleryComment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  artistId: Types.ObjectId;

  @Prop({ required: true })
  imageUrl: string;

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
GalleryCommentSchema.index({ artistId: 1, imageUrl: 1, createdAt: -1 });
GalleryCommentSchema.index({ userId: 1 });