import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from 'src/users/users.module';
import { CommandModule } from 'nestjs-command';
import { CartModule } from 'src/cart/cart.module';
import { OrderModule } from '../orders/order.module';
import { PaymentsModule } from '../payments/payments.module';
// import { SeedsModule } from '../seeds/seeds.module';
import { AppController } from './controllers/app.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AppService } from './services/app.service';
import { AiModule } from '@/ai/ai.module';
import { AwsS3Module } from '@/aws-s3/aws-s3.module';
import { ForumsModule } from '@/forums/forums.module';
import { GoogleStrategy } from '@/strategies/google.strategy';
import { connectDB } from '@/utils/config';
import {
  IndexCleanupService,
  ProductsModule,
} from '@/products/products.module';
import { CategoriesModule } from '@/categories/categories.module';
import { BannerModule } from '@/banners/banner.module';
import { SharedServicesModule } from './shared-services.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: connectDB,
    }),
    CommandModule,
    ProductsModule,
    UsersModule,
    CartModule,
    OrderModule,
    PaymentsModule,
    CloudinaryModule,
    AiModule,
    // SeedsModule,
    AwsS3Module,
    ForumsModule,
    CategoriesModule,
    BannerModule,
  ],
  controllers: [AppController],
  providers: [AppService, GoogleStrategy, IndexCleanupService],
  exports: [AppService],
})
export class AppModule {}
