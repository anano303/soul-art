import { IsObject, IsOptional, IsString, IsBoolean } from 'class-validator';

export class PushSubscriptionDto {
  @IsObject()
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  userEmail?: string;
}

export class PushNotificationDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsString()
  icon: string;

  @IsString()
  badge: string;

  @IsObject()
  data: {
    url?: string;
    type:
      | 'new_product'
      | 'discount'
      | 'order_status'
      | 'product_approved'
      | 'product_rejected'
      | 'new_forum_post';
    id?: string;
  };

  @IsString()
  tag: string;

  @IsBoolean()
  requireInteraction: boolean;
}
