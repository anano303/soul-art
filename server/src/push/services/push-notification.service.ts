import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as webpush from 'web-push';
import { PushSubscription as PushSubscriptionDoc } from '../schemas/push-subscription.schema';

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

  constructor(
    private configService: ConfigService,
    @InjectModel('PushSubscription')
    private pushSubscriptionModel: Model<PushSubscriptionDoc>,
  ) {
    this.initializeVAPID();
    this.loadSubscriptionsFromDatabase();
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

  private async loadSubscriptionsFromDatabase() {
    try {
      const subscriptions = await this.pushSubscriptionModel
        .find({
          isActive: true,
        })
        .exec();

      for (const sub of subscriptions) {
        const pushSubscription: PushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        const subscriptionKey = JSON.stringify(pushSubscription);
        this.subscriptions.set(subscriptionKey, {
          subscription: pushSubscription,
          userId: sub.userId?.toString(),
          userEmail: sub.userEmail,
        });
      }

      this.logger.log(
        `📥 Loaded ${subscriptions.length} push subscriptions from database`,
      );
    } catch (error) {
      this.logger.error('Failed to load subscriptions from database:', error);
    }
  }

  async subscribe(
    subscription: PushSubscription,
    userId?: string,
    userEmail?: string,
  ) {
    try {
      // Save to database
      const existingSubscription = await this.pushSubscriptionModel.findOne({
        endpoint: subscription.endpoint,
      });

      if (existingSubscription) {
        // Update existing subscription
        existingSubscription.p256dh = subscription.keys.p256dh;
        existingSubscription.auth = subscription.keys.auth;
        existingSubscription.userId = userId ? (userId as any) : undefined;
        existingSubscription.userEmail = userEmail;
        existingSubscription.isActive = true;
        existingSubscription.lastUsed = new Date();
        await existingSubscription.save();

        this.logger.log(`📝 Updated existing push subscription`);
      } else {
        // Create new subscription
        await this.pushSubscriptionModel.create({
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userId: userId ? (userId as any) : undefined,
          userEmail,
          isActive: true,
        });

        this.logger.log(`💫 Saved new push subscription to database`);
      }

      // Also keep in memory for immediate use
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
    } catch (error) {
      this.logger.error('Failed to save subscription to database:', error);
      return {
        success: false,
        message: 'შეცდომა გამოწერის დროს',
      };
    }
  }

  async unsubscribe(subscription: PushSubscription) {
    try {
      // Remove from database
      await this.pushSubscriptionModel.updateOne(
        { endpoint: subscription.endpoint },
        { isActive: false },
      );

      // Remove from memory
      const subscriptionKey = JSON.stringify(subscription);
      this.subscriptions.delete(subscriptionKey);

      this.logger.log('🚫 Push notification subscription cancelled');

      return {
        success: true,
        message: 'თქვენ წარმატებით გაუქმეთ შეტყობინებები',
      };
    } catch (error) {
      this.logger.error('Failed to unsubscribe from database:', error);
      return {
        success: false,
        message: 'შეცდომა გამოწერის გაუქმების დროს',
      };
    }
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

    const subscriptionsToRemove: string[] = [];

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

        // Remove invalid subscriptions (410 Gone, 413 Payload Too Large, etc.)
        if (
          error.statusCode === 410 ||
          error.statusCode === 413 ||
          error.message.includes('unexpected response code')
        ) {
          subscriptionsToRemove.push(key);
          this.logger.log(
            `🗑️ Marking invalid subscription for removal: ${error.statusCode || 'Unknown error'}`,
          );
        }
      }
    }

    // Remove invalid subscriptions
    for (const key of subscriptionsToRemove) {
      this.subscriptions.delete(key);
      this.logger.log(`🗑️ Removed invalid subscription`);
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
