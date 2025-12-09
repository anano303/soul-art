import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ProductsModule } from '@/products/products.module';
import { CategoriesModule } from '@/categories/categories.module';
import { BlogModule } from '@/blog/blog.module';
import { BannerModule } from '@/banners/banner.module';

@Module({
  imports: [ProductsModule, CategoriesModule, BlogModule, BannerModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
