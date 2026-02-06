import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { AuctionController } from './controllers/auction.controller';
import { AuctionAdminController } from './controllers/auction-admin.controller';
import { AuctionService } from './services/auction.service';
import { AuctionAdminService } from './services/auction-admin.service';
import { Auction, AuctionSchema } from './schemas/auction.schema';
import {
  AuctionSettings,
  AuctionSettingsSchema,
} from './schemas/auction-settings.schema';
import {
  AuctionAdminEarnings,
  AuctionAdminEarningsSchema,
} from './schemas/auction-admin-earnings.schema';
import {
  AuctionAdminWithdrawal,
  AuctionAdminWithdrawalSchema,
} from './schemas/auction-admin-withdrawal.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

// Import related modules
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { AwsS3Module } from '../aws-s3/aws-s3.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Auction.name, schema: AuctionSchema },
      { name: AuctionSettings.name, schema: AuctionSettingsSchema },
      { name: AuctionAdminEarnings.name, schema: AuctionAdminEarningsSchema },
      { name: AuctionAdminWithdrawal.name, schema: AuctionAdminWithdrawalSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ScheduleModule.forRoot(), // For cron jobs
    forwardRef(() => UsersModule), // For BalanceService and User model
    EmailModule,
    AwsS3Module,
  ],
  controllers: [AuctionController, AuctionAdminController],
  providers: [AuctionService, AuctionAdminService],
  exports: [AuctionService, AuctionAdminService],
})
export class AuctionModule {}
