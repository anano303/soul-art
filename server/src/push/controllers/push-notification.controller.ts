import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  NotificationPayload,
  PushNotificationService,
} from '../services/push-notification.service';
import {
  PushSubscriptionDto,
  PushNotificationDto,
  NewProductNotificationDto,
} from '../dtos/push-notification.dto';
import { Request } from 'express';

@ApiTags('push-notifications')
@Controller('push')
export class PushNotificationController {
  constructor(private readonly pushService: PushNotificationService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  @ApiResponse({ status: 200, description: 'Subscription successful' })
  async subscribe(@Body() body: PushSubscriptionDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'] as string | undefined;
    const forwardedFor = req.headers['x-forwarded-for'] as string | undefined;
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || req.ip;

    return this.pushService.subscribe(
      body.subscription,
      body.userId,
      body.userEmail,
      {
        userAgent,
        ipAddress,
      },
    );
  }

  @Post('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  @ApiResponse({ status: 200, description: 'Unsubscription successful' })
  async unsubscribe(@Body() body: { subscription: any }) {
    return this.pushService.unsubscribe(body.subscription);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send push notification to all subscribers' })
  @ApiResponse({ status: 200, description: 'Notifications sent' })
  async sendToAll(@Body() body: { payload: PushNotificationDto }) {
    const results = await this.pushService.sendToAll(body.payload);
    return {
      success: true,
      sent: results.successful,
      failed: results.failed,
      message: `შეტყობინება გაიგზავნა ${results.successful} მომხმარებელზე`,
    };
  }

  @Post('send-to-user')
  @ApiOperation({ summary: 'Send push notification to specific user' })
  @ApiResponse({ status: 200, description: 'Notification sent to user' })
  async sendToUser(
    @Body() body: { payload: PushNotificationDto; userId: string },
  ) {
    const results = await this.pushService.sendToUser(
      body.userId,
      body.payload,
    );
    return {
      success: true,
      sent: results.successful,
      failed: results.failed,
      message: `შეტყობინება გაიგზავნა მომხმარებელს`,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get push notification statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  getStats() {
    return {
      success: true,
      stats: this.pushService.getStats(),
    };
  }

  @Get('test')
  @ApiOperation({ summary: 'Send test push notification' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async sendTest() {
    const testPayload = {
      title: 'ტესტური შეტყობინება',
      body: 'თქვენი push notification-ები მუშაობს!',
      icon: '/logo.png',
      badge: '/logo.png',
      data: {
        url: '/',
        type: 'new_product' as const,
      },
      tag: 'test',
      requireInteraction: true,
    };

    const results = await this.pushService.sendToAll(testPayload);
    return {
      success: true,
      sent: results.successful,
      failed: results.failed,
      message: 'ტესტური შეტყობინება გაიგზავნა',
    };
  }

  @Post('new-product')
  @ApiOperation({ summary: 'Broadcast a new product notification' })
  @ApiResponse({ status: 200, description: 'Notification dispatched' })
  async sendNewProduct(@Body() body: NewProductNotificationDto) {
    const {
      productId,
      productName,
      productPrice,
      productImage,
      category,
      subCategory,
    } = body;

    const priceText = productPrice ? ` • ფასი: ${productPrice} ₾` : '';
    const categoryText = [category, subCategory]
      .filter(Boolean)
      .map((value) => `#${value?.toString().replace(/\s+/g, '').toLowerCase()}`)
      .join(' ');

    const payload: NotificationPayload = {
      title: '🆕 ახალი ნამუშევარი SoulArt-ზე!',
      body: `${productName}${priceText}`.trim(),
      icon: productImage || '/android-icon-192x192.png',
      badge: '/favicon-96x96.png',
      data: {
        type: 'new_product' as const,
        url: `/products/${productId}`,
        id: productId,
      },
      tag: `new-product-${productId}`,
      requireInteraction: true,
    };

    if (categoryText) {
      payload.body = `${payload.body}\n${categoryText}`;
    }

    const results = await this.pushService.sendToAll(payload);

    return {
      success: true,
      sent: results.successful,
      failed: results.failed,
    };
  }
}
