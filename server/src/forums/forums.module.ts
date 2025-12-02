import { Module } from '@nestjs/common';
import { ForumsService } from './forums.service';
import { ForumsController } from './forums.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Forum,
  ForumSchema,
  Comment,
  CommentSchema,
} from './schema/forum.schema';
import { UsersService } from '@/users/services/users.service';
import { UsersModule } from '@/users/users.module';
import { CloudinaryModule } from '@/cloudinary/cloudinary.module';
import { PushNotificationModule } from '@/push/push-notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Forum.name, schema: ForumSchema },
      { name: Comment.name, schema: CommentSchema },
    ]),
    UsersModule,
    CloudinaryModule,
    PushNotificationModule,
  ],

  controllers: [ForumsController],
  providers: [ForumsService],
})
export class ForumsModule {}
