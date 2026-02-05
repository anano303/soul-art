import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { AuctionController } from './controllers/auction.controller';
import { AuctionService } from './services/auction.service';
import { Auction, AuctionSchema } from './schemas/auction.schema';

// Import related modules
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { AwsS3Module } from '../aws-s3/aws-s3.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Auction.name, schema: AuctionSchema }]),
    ScheduleModule.forRoot(), // For cron jobs
    forwardRef(() => UsersModule), // For BalanceService and User model
    EmailModule,
    AwsS3Module,
  ],
  controllers: [AuctionController],
  providers: [AuctionService],
  exports: [AuctionService],
})
export class AuctionModule {}
