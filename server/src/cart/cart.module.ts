import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartController } from './controller/cart.controller';
import { CartService } from './services/cart.service';
import { Cart, CartSchema } from './schemas/cart.schema';
import { ProductsModule } from '@/products/products.module';
import { PromotionModule } from '@/promotions/promotion.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
    ProductsModule,
    forwardRef(() => PromotionModule),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
