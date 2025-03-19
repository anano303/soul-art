import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Comment extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
  _id: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: mongoose.Schema.Types.ObjectId;

  @Prop({ type: String })
  content: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, default: null })
  parentId: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    default: [],
  })
  replies: mongoose.Schema.Types.ObjectId[];
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

@Schema({ timestamps: true })
export class Forum extends Document {
  @Prop({ type: String })
  content: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: [String],
    enum: {
      values: [
        'პეიზაჟი',
        'პორტრეტი',
        'აბსტრაქცია',
        'შავ-თეთრი',
        'ანიმაციური',
        'ციფრული ილუსტრაციები',
        'სხვა',
      ],
      message:
        'Tags must be one of: პეიზაჟი, პორტრეტი, აბსტრაქცია,შავ-თეთრი,ანიმაციური,ციფრული ილუსტრაციები,სხვა',
    },
    required: true,
  })
  tags: string[];

  @Prop({ type: [{ type: CommentSchema }], default: [] })
  comments: Comment[];

  @Prop({ type: Number, default: 0 })
  likes: number;

  @Prop({ type: [mongoose.Schema.Types.ObjectId], default: [] })
  likesArray: mongoose.Schema.Types.ObjectId[];

  @Prop({ type: String })
  imagePath: string;
}

export const ForumSchema = SchemaFactory.createForClass(Forum);
