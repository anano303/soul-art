import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReferralsController } from './controllers/referrals.controller';
import { ReferralsService } from './services/referrals.service';
import { Referral, ReferralSchema } from './schemas/referral.schema';
import {
  BalanceTransaction,
  BalanceTransactionSchema,
} from './schemas/balance-transaction.schema';
import {
  WithdrawalRequest,
  WithdrawalRequestSchema,
} from './schemas/withdrawal-request.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Referral.name, schema: ReferralSchema },
      { name: BalanceTransaction.name, schema: BalanceTransactionSchema },
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => ProductsModule),
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
