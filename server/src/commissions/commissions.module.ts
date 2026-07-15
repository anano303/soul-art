import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { Commission, CommissionSchema } from './schemas/commission.schema';
import { User, UserSchema } from '@/users/schemas/user.schema';
import { Order, OrderSchema } from '@/orders/schemas/order.schema';
import { CommissionsController } from './commissions.controller';
import { CommissionsService } from './services/commissions.service';

import { UsersModule } from '@/users/users.module';
import { EmailModule } from '@/email/email.module';
import { PushNotificationModule } from '@/push/push-notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Commission.name, schema: CommissionSchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    ScheduleModule.forRoot(),
    forwardRef(() => UsersModule), // BalanceService + User model
    EmailModule,
    PushNotificationModule,
    // StorageService is provided by the global StorageModule (S3/Cloudinary).
  ],
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
