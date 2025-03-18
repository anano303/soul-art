import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from 'src/users/users.module';
import { CommandModule } from 'nestjs-command';
import { CartModule } from 'src/cart/cart.module';
import { OrderModule } from '../orders/order.module';
// import { SeedsModule } from '../seeds/seeds.module';
import { AppController } from './controllers/app.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AppService } from './services/app.service';
import { AiModule } from '@/ai/ai.module';
import { AwsS3Module } from '@/aws-s3/aws-s3.module';
import { ForumsModule } from '@/forums/forums.module';
import { GoogleStrategy } from '@/strategies/google.strategy';
import { connectDB } from '@/utils/config';
import { ProductsModule } from '@/products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: connectDB,
    }),
    CommandModule,
    ProductsModule,
    UsersModule,
    CartModule,
    OrderModule,
    CloudinaryModule,
    AiModule,
    // SeedsModule,
    AwsS3Module,
    ForumsModule,
  ],
  controllers: [AppController],
  providers: [AppService, GoogleStrategy],
})
export class AppModule {}
