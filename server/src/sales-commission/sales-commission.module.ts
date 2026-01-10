import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesCommissionController } from './controllers/sales-commission.controller';
import { SalesCommissionService } from './services/sales-commission.service';
import {
  SalesCommission,
  SalesCommissionSchema,
} from './schemas/sales-commission.schema';
import {
  SalesTracking,
  SalesTrackingSchema,
} from './schemas/sales-tracking.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import {
  BalanceTransaction,
  BalanceTransactionSchema,
} from '../users/schemas/seller-balance.schema';
import { UsersModule } from '../users/users.module';
import { PaymentsModule } from '../payments/payments.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalesCommission.name, schema: SalesCommissionSchema },
      { name: SalesTracking.name, schema: SalesTrackingSchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
      { name: BalanceTransaction.name, schema: BalanceTransactionSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => PaymentsModule),
    EmailModule,
  ],
  controllers: [SalesCommissionController],
  providers: [SalesCommissionService],
  exports: [SalesCommissionService],
})
export class SalesCommissionModule {}
