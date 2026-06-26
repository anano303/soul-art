import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PriceOffer,
  PriceOfferSchema,
} from './schemas/price-offer.schema';
import { Product, ProductSchema } from '@/products/schemas/product.schema';
import { User, UserSchema } from '@/users/schemas/user.schema';
import { EmailModule } from '@/email/email.module';
import { PushNotificationModule } from '@/push/push-notification.module';
import { PriceOffersController } from './price-offers.controller';
import { PriceOffersService } from './services/price-offers.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PriceOffer.name, schema: PriceOfferSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
    ]),
    EmailModule,
    PushNotificationModule,
  ],
  controllers: [PriceOffersController],
  providers: [PriceOffersService],
  exports: [PriceOffersService],
})
export class PriceOffersModule {}
