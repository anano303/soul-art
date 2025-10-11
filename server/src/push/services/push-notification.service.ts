import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushSubscriptionWithUser {
  subscription: PushSubscription;
  userId?: string;
  userEmail?: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon: string;
  badge: string;
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
  tag: string;
  requireInteraction: boolean;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private subscriptions: Map<string, PushSubscriptionWithUser> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeVAPID();
  }

  private initializeVAPID() {
    const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const vapidEmail =
      this.configService.get<string>('VAPID_EMAIL') ||
      'mailto:support@soulart.ge';

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
      this.logger.log('VAPID keys configured successfully');
    } else {
      this.logger.warn(
        'VAPID keys not configured - push notifications will not work',
      );
    }
  }

  subscribe(
    subscription: PushSubscription,
    userId?: string,
    userEmail?: string,
  ) {
    const subscriptionKey = JSON.stringify(subscription);
    this.subscriptions.set(subscriptionKey, {
      subscription,
      userId,
      userEmail,
    });

    this.logger.log(`💫 New push notification subscription registered`, {
      userId,
      userEmail,
    });

    return {
      success: true,
      message: 'თქვენ წარმატებით გამოიწერეთ შეტყობინებები',
    };
  }

  unsubscribe(subscription: PushSubscription) {
    const subscriptionKey = JSON.stringify(subscription);
    this.subscriptions.delete(subscriptionKey);

    this.logger.log('🚫 Push notification subscription cancelled');

    return { success: true, message: 'თქვენ წარმატებით გაუქმეთ შეტყობინებები' };
  }

  async sendToAll(payload: NotificationPayload) {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (!this.isVAPIDConfigured()) {
      results.errors.push('VAPID keys არ არის კონფიგურირებული');
      return results;
    }

    for (const [key, subscriptionData] of this.subscriptions) {
      try {
        await webpush.sendNotification(
          subscriptionData.subscription,
          JSON.stringify(payload),
        );
        results.successful++;
      } catch (error) {
        results.failed++;
        const errorMessage = `Failed to send to subscription: ${error.message}`;
        results.errors.push(errorMessage);
        this.logger.error(errorMessage);
      }
    }

    return results;
  }

  async sendToUser(userId: string, payload: NotificationPayload) {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (!this.isVAPIDConfigured()) {
      results.errors.push('VAPID keys არ არის კონფიგურირებული');
      return results;
    }

    const userSubscriptions = Array.from(this.subscriptions.values()).filter(
      (sub) => sub.userId === userId,
    );

    if (userSubscriptions.length === 0) {
      this.logger.log(`ℹ️ User ${userId} has no active push subscriptions`);
      return results;
    }

    for (const subscriptionData of userSubscriptions) {
      try {
        await webpush.sendNotification(
          subscriptionData.subscription,
          JSON.stringify(payload),
        );
        results.successful++;
      } catch (error) {
        results.failed++;
        const errorMessage = `Failed to send to user ${userId}: ${error.message}`;
        results.errors.push(errorMessage);
        this.logger.error(errorMessage);
      }
    }

    return results;
  }

  getStats() {
    return {
      totalSubscriptions: this.subscriptions.size,
      vapidConfigured: this.isVAPIDConfigured(),
    };
  }

  private isVAPIDConfigured(): boolean {
    const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    return !!(vapidPublicKey && vapidPrivateKey);
  }
}
