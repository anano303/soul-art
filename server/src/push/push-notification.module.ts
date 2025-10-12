import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PushNotificationController } from './controllers/push-notification.controller';
import { PushNotificationService } from './services/push-notification.service';
import { PushSubscriptionSchema } from './schemas/push-subscription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'PushSubscription', schema: PushSubscriptionSchema },
    ]),
  ],
  controllers: [PushNotificationController],
  providers: [PushNotificationService],
  exports: [PushNotificationService],
})
export class PushNotificationModule {}
