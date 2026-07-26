import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsModule } from '../payments/payments.module';
import { ProductsModule } from '../products/products.module';
import { EtsyService } from './etsy.service';
import { EtsyListingService } from './etsy-listing.service';
import { EtsyController } from './etsy.controller';
import { EtsyAuth, EtsyAuthSchema } from './schemas/etsy-auth.schema';
import { EtsyListing, EtsyListingSchema } from './schemas/etsy-listing.schema';
import {
  EtsyFeePayment,
  EtsyFeePaymentSchema,
} from './schemas/etsy-fee-payment.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  SellerBalance,
  SellerBalanceSchema,
  BalanceTransaction,
  BalanceTransactionSchema,
} from '../users/schemas/seller-balance.schema';
import { ExchangeRateModule } from '../exchange-rate/exchange-rate.module';

@Module({
  imports: [
    ConfigModule,
    ExchangeRateModule,
    forwardRef(() => PaymentsModule),
    forwardRef(() => ProductsModule),
    MongooseModule.forFeature([
      { name: EtsyAuth.name, schema: EtsyAuthSchema },
      { name: EtsyListing.name, schema: EtsyListingSchema },
      { name: EtsyFeePayment.name, schema: EtsyFeePaymentSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      { name: SellerBalance.name, schema: SellerBalanceSchema },
      { name: BalanceTransaction.name, schema: BalanceTransactionSchema },
    ]),
  ],
  controllers: [EtsyController],
  providers: [EtsyService, EtsyListingService],
  exports: [EtsyService, EtsyListingService],
})
export class EtsyModule {}
