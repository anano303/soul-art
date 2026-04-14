import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Promotion,
  PromotionDocument,
} from './schemas/promotion.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { PushNotificationService } from '../push/services/push-notification.service';

@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

  constructor(
    @InjectModel(Promotion.name)
    private promotionModel: Model<PromotionDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async create(data: {
    productId: string;
    productName: string;
    productPrice: number;
    productImage: string;
    productUrl: string;
    platforms: string[];
    duration: number;
    totalPrice: number;
    note?: string;
    sellerId: string;
    sellerName: string;
    sellerEmail: string;
    externalOrderId: string;
  }): Promise<PromotionDocument> {
    const promotion = new this.promotionModel({
      ...data,
      productId: new Types.ObjectId(data.productId),
      sellerId: new Types.ObjectId(data.sellerId),
      status: 'paid',
    });
    return promotion.save();
  }

  async findAll(
    status?: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: PromotionDocument[]; total: number }> {
    const query: any = {};
    if (status) {
      query.status = status;
    }
    const [items, total] = await Promise.all([
      this.promotionModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.promotionModel.countDocuments(query),
    ]);
    return { items: items as PromotionDocument[], total };
  }

  async findByExternalOrderId(
    externalOrderId: string,
  ): Promise<PromotionDocument | null> {
    return this.promotionModel.findOne({ externalOrderId }).lean();
  }

  // Increment stat for active promotions of a product
  async trackStat(
    productId: string,
    stat: 'statsViews' | 'statsAddToCart' | 'statsOrders',
  ) {
    const now = new Date();
    await this.promotionModel.updateMany(
      {
        productId: new Types.ObjectId(productId),
        status: 'confirmed',
        confirmedAt: { $lte: now },
        expiresAt: { $gt: now },
      },
      { $inc: { [stat]: 1 } },
    );
  }

  // Find promotions for a specific seller
  async findBySeller(
    sellerId: string,
    status?: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: PromotionDocument[]; total: number }> {
    const query: any = { sellerId: new Types.ObjectId(sellerId) };
    if (status) {
      query.status = status;
    }
    const [items, total] = await Promise.all([
      this.promotionModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.promotionModel.countDocuments(query),
    ]);
    return { items: items as PromotionDocument[], total };
  }

  async confirm(id: string): Promise<PromotionDocument> {
    const promotion = await this.promotionModel.findById(id);
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }
    if (promotion.status !== 'paid') {
      throw new Error('Promotion already confirmed or expired');
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + promotion.duration * 24 * 60 * 60 * 1000,
    );

    promotion.status = 'confirmed';
    promotion.confirmedAt = now;
    promotion.expiresAt = expiresAt;
    await promotion.save();

    // Send in-app notification to seller
    const platformLabels: Record<string, string> = {
      facebook: 'Facebook',
      instagram: 'Instagram',
      google: 'Google Ads',
      tiktok: 'TikTok',
    };
    const platformStr = promotion.platforms
      .map((p) => platformLabels[p] || p)
      .join(', ');

    const expiresDateStr = expiresAt.toLocaleDateString('ka-GE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const notification = {
      id: new Types.ObjectId().toString(),
      title: '🚀 თქვენი რეკლამა გაშვებულია!',
      message: `${promotion.productName} - ${platformStr} | ვადა: ${promotion.duration} დღე (${expiresDateStr}-მდე)`,
      type: 'success' as const,
      category: 'system' as const,
      priority: 100,
      actionUrl: promotion.productUrl,
      actionLabel: 'პროდუქტის ნახვა',
      createdAt: new Date(),
      createdByUserId: null,
      readAt: null,
    };

    await this.userModel.updateOne(
      { _id: promotion.sellerId },
      {
        $push: {
          sellerNotifications: {
            $each: [notification],
            $slice: -80,
          },
        },
      },
    );

    // Also send push notification
    try {
      await this.pushNotificationService.sendToUser(
        promotion.sellerId.toString(),
        {
          title: '🚀 რეკლამა გაშვებულია!',
          body: `${promotion.productName} - ${platformStr} | ${promotion.duration} დღე`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          data: {
            url: promotion.productUrl,
            type: 'product_approved',
          },
          tag: `promo-confirmed-${promotion._id}`,
          requireInteraction: false,
        },
      );
    } catch (err: any) {
      this.logger.warn(`Push notification failed: ${err.message}`);
    }

    return promotion;
  }

  // Check every 10 minutes for promotions expiring within 1 hour
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkExpiringPromotions() {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const expiring = await this.promotionModel.find({
      status: 'confirmed',
      expiryNotified: false,
      expiresAt: { $lte: oneHourLater, $gt: now },
    });

    for (const promo of expiring) {
      try {
        const platformLabels: Record<string, string> = {
          facebook: 'Facebook',
          instagram: 'Instagram',
          google: 'Google Ads',
          tiktok: 'TikTok',
        };
        const platformStr = promo.platforms
          .map((p) => platformLabels[p] || p)
          .join(', ');

        const notification = {
          id: new Types.ObjectId().toString(),
          title: '⏰ რეკლამას ვადა ეწურება!',
          message: `${promo.productName} (${platformStr}) - რეკლამას ვადა გასდის 1 საათში`,
          type: 'warning' as const,
          category: 'system' as const,
          priority: 100,
          actionUrl: promo.productUrl,
          actionLabel: 'პროდუქტის ნახვა',
          createdAt: new Date(),
          createdByUserId: null,
          readAt: null,
        };

        await this.userModel.updateOne(
          { _id: promo.sellerId },
          {
            $push: {
              sellerNotifications: {
                $each: [notification],
                $slice: -80,
              },
            },
          },
        );

        // Push notification
        await this.pushNotificationService.sendToUser(
          promo.sellerId.toString(),
          {
            title: '⏰ რეკლამას ვადა ეწურება!',
            body: `${promo.productName} - 1 საათში იწურება`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            data: {
              url: promo.productUrl,
              type: 'product_approved',
            },
            tag: `promo-expiry-${promo._id}`,
            requireInteraction: true,
          },
        );

        promo.expiryNotified = true;
        await promo.save();
        this.logger.log(
          `Expiry notification sent for promotion ${promo._id}`,
        );
      } catch (err: any) {
        this.logger.error(
          `Failed to send expiry notification for ${promo._id}: ${err.message}`,
        );
      }
    }

    // Also mark expired promotions
    await this.promotionModel.updateMany(
      {
        status: 'confirmed',
        expiresAt: { $lte: now },
      },
      { $set: { status: 'expired' } },
    );
  }
}
