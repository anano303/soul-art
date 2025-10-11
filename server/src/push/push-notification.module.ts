import { Module } from '@nestjs/common';
import { PushNotificationController } from './controllers/push-notification.controller';
import { PushNotificationService } from './services/push-notification.service';

@Module({
  controllers: [PushNotificationController],
  providers: [PushNotificationService],
  exports: [PushNotificationService],
})
export class PushNotificationModule {}
