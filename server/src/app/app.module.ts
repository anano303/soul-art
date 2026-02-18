import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from '../users/users.module';
import { CommandModule } from 'nestjs-command';
import { CartModule } from 'src/cart/cart.module';
import { OrderModule } from '../orders/order.module';
import { PaymentsModule } from '../payments/payments.module';
// import { SeedsModule } from '../seeds/seeds.module';
import { AppController } from './controllers/app.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AppService } from './services/app.service';
import { AiModule } from '@/ai/ai.module';
import { ForumsModule } from '@/forums/forums.module';
import { GoogleStrategy } from '@/strategies/google.strategy';
import { connectDB } from '@/utils/config';
import { ProductsModule } from '@/products/products.module';
import { CategoriesModule } from '@/categories/categories.module';
import { BannerModule } from '@/banners/banner.module';
import { SharedServicesModule } from './shared-services.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { PushNotificationModule } from '../push/push-notification.module';
import { BlogModule } from '../blog/blog.module';
import { YoutubeModule } from '@/youtube/youtube.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DonationsModule } from '../donations/donations.module';
import { ChatModule } from '../chat/chat.module';
import { SalesCommissionModule } from '../sales-commission/sales-commission.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { AuctionModule } from '../auctions/auction.module';
import { SettingsModule } from '../settings/settings.module';
import { GeoModule } from '../geo/geo.module';
import { ExchangeRateModule } from '../exchange-rate/exchange-rate.module';

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
    ForumsModule,
    CategoriesModule,
    BannerModule,
    ReferralsModule,
    PushNotificationModule,
    BlogModule,
    YoutubeModule,
    AnalyticsModule,
    DonationsModule,
    ChatModule,
    SalesCommissionModule,
    CampaignsModule,
    AuctionModule,
    SettingsModule,
    GeoModule,
    ExchangeRateModule,
  ],
  controllers: [AppController],
  providers: [AppService, GoogleStrategy],
  exports: [AppService],
})
export class AppModule {}
