import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatLog, ChatLogSchema } from './chat-log.schema';
import { ProductsModule } from '@/products/products.module';
import { CategoriesModule } from '@/categories/categories.module';
import { BlogModule } from '@/blog/blog.module';
import { BannerModule } from '@/banners/banner.module';
import { EmailService } from '@/email/services/email.services';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ChatLog.name, schema: ChatLogSchema }]),
    ProductsModule,
    CategoriesModule,
    BlogModule,
    BannerModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, EmailService],
  exports: [ChatService],
})
export class ChatModule {}
