import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsController } from './payments.controller';
import { BogAdminController } from './controllers/bog-admin.controller';
import { PaymentsService } from './payments.service';
import { BogTransferService } from './services/bog-transfer.service';
import { BogStatusCheckerService } from './services/bog-status-checker.service';
import { OrderModule } from '../orders/order.module';
import { EmailService } from '../email/services/email.services';
import {
  BalanceTransaction,
  BalanceTransactionSchema,
} from '../users/schemas/seller-balance.schema';
import {
  SellerBalance,
  SellerBalanceSchema,
} from '../users/schemas/seller-balance.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    forwardRef(() => OrderModule),
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: BalanceTransaction.name, schema: BalanceTransactionSchema },
      { name: SellerBalance.name, schema: SellerBalanceSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PaymentsController, BogAdminController],
  providers: [
    PaymentsService,
    BogTransferService,
    BogStatusCheckerService,
    EmailService,
  ],
  exports: [PaymentsService, BogTransferService, BogStatusCheckerService],
})
export class PaymentsModule {}
