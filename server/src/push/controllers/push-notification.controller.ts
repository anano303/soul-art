import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PushNotificationService } from '../services/push-notification.service';
import {
  PushSubscriptionDto,
  PushNotificationDto,
} from '../dtos/push-notification.dto';

@ApiTags('push-notifications')
@Controller('push')
export class PushNotificationController {
  constructor(private readonly pushService: PushNotificationService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  @ApiResponse({ status: 200, description: 'Subscription successful' })
  subscribe(@Body() body: PushSubscriptionDto) {
    return this.pushService.subscribe(
      body.subscription,
      body.userId,
      body.userEmail,
    );
  }

  @Post('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  @ApiResponse({ status: 200, description: 'Unsubscription successful' })
  unsubscribe(@Body() body: { subscription: any }) {
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
}
