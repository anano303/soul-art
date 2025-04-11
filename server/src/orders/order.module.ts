import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './controller/orders.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrdersService } from './services/orders.service';
import { ProductsModule } from '@/products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Order.name,
        schema: OrderSchema,
      },
    ]),
    ProductsModule, // This will make the Product model available in the OrdersService
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrderModule {}
