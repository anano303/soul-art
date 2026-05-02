import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Voucher, VoucherSchema } from './schemas/voucher.schema';
import { VoucherService } from './services/voucher.service';
import { VoucherController } from './controllers/voucher.controller';
import { OrderModule } from '../orders/order.module';
import { PaymentsModule } from '../payments/payments.module';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Voucher.name, schema: VoucherSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    forwardRef(() => OrderModule),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [VoucherController],
  providers: [VoucherService],
  exports: [VoucherService],
})
export class VoucherModule {}
