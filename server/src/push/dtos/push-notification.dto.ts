import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

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

export class NewProductNotificationDto {
  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  productPrice?: string;

  @IsOptional()
  @IsUrl({}, { message: 'productImage must be a valid URL' })
  productImage?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subCategory?: string;
}
