import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { Promotion, PromotionSchema } from './schemas/promotion.schema';
import { PromotionService } from './promotion.service';
import { PromotionController } from './promotion.controller';
import { UsersModule } from '../users/users.module';
import { PushNotificationModule } from '../push/push-notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Promotion.name, schema: PromotionSchema },
    ]),
    ScheduleModule.forRoot(),
    forwardRef(() => UsersModule),
    PushNotificationModule,
  ],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
