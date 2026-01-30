import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PushNotificationController } from './controllers/push-notification.controller';
import { PushNotificationService } from './services/push-notification.service';
import { PushSubscriptionSchema } from './schemas/push-subscription.schema';
import { UserSchema } from '@/users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'PushSubscription', schema: PushSubscriptionSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [PushNotificationController],
  providers: [PushNotificationService],
  exports: [PushNotificationService],
})
export class PushNotificationModule {}
