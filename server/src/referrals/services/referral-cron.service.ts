import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Referral,
  ReferralDocument,
  ReferralStatus,
  ReferralType,
} from '../schemas/referral.schema';
import { ReferralsService } from './referrals.service';

@Injectable()
export class ReferralCronService {
  private readonly logger = new Logger(ReferralCronService.name);

  constructor(
    @InjectModel(Referral.name) private referralModel: Model<ReferralDocument>,
    private readonly referralsService: ReferralsService,
  ) {}

  // Check every minute for seller referrals that should auto-approve
  @Cron(CronExpression.EVERY_MINUTE)
  async autoApproveSellers(): Promise<void> {
    try {
      const pendingSellerReferrals = await this.referralModel
        .find({
          type: ReferralType.SELLER,
          status: {
            $in: [ReferralStatus.PENDING, ReferralStatus.PRODUCTS_UPLOADED],
          },
        })
        .select('referred')
        .lean();

      const sellerIds = Array.from(
        new Set(
          pendingSellerReferrals
            .map((r: any) => r.referred?.toString?.())
            .filter(Boolean) as string[],
        ),
      );

      for (const sellerId of sellerIds) {
        await this.referralsService.approveSellerAndPayBonus(sellerId);
      }
    } catch (e) {
      this.logger.warn(`autoApproveSellers failed: ${e?.message || e}`);
    }
  }
}
