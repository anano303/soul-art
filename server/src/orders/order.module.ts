import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './controller/orders.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { OrdersService } from './services/orders.service';
import { StockReservationService } from './services/stock-reservation.service';
import { ProductsModule } from '@/products/products.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Order.name,
        schema: OrderSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    ProductsModule, // This will make the Product model available in the OrdersService
    UsersModule, // This will make BalanceService available
  ],
  controllers: [OrdersController],
  providers: [OrdersService, StockReservationService],
  exports: [OrdersService, StockReservationService],
})
export class OrderModule {}
