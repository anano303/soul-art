import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@/users/schemas/user.schema';
import {
  Referral,
  ReferralDocument,
  ReferralStatus,
  ReferralType,
} from '../schemas/referral.schema';
import {
  ReferralBalanceTransaction,
  ReferralBalanceTransactionDocument,
  TransactionStatus,
  TransactionType,
} from '../schemas/balance-transaction.schema';

@Injectable()
export class ReferralMaintenanceService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ReferralMaintenanceService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Referral.name) private referralModel: Model<ReferralDocument>,
    @InjectModel(ReferralBalanceTransaction.name)
    private txModel: Model<ReferralBalanceTransactionDocument>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.normalizeSellerReferrals();
      await this.normalizeUserReferrals(); // Add this line
      await this.recalculateReferralBalances();
    } catch (e) {
      this.logger.warn(`Maintenance failed: ${e?.message || e}`);
    }
  }

  // Keep one SELLER referral per referred user; delete duplicates; set APPROVED if approvedAt exists
  private async normalizeSellerReferrals(): Promise<void> {
    const sellerRefs = await this.referralModel
      .find({ type: ReferralType.SELLER })
      .sort({ createdAt: 1 })
      .lean();

    const byReferred = new Map<string, ReferralDocument[]>();
    for (const r of sellerRefs as any[]) {
      const key = r.referred.toString();
      const list = byReferred.get(key) || [];
      list.push(r as any);
      byReferred.set(key, list);
    }

    for (const [referredId, refs] of byReferred.entries()) {
      if (refs.length <= 1) continue;
      // Keep the first (oldest), delete others
      const keep = refs[0];
      const remove = refs.slice(1).map((r) => r._id);
      await this.referralModel.deleteMany({ _id: { $in: remove } });
      this.logger.log(
        `Deleted ${remove.length} duplicate seller referrals for referred=${referredId}`,
      );
      // Ensure status consistency: if any duplicate had APPROVED, mark kept as APPROVED
      const anyApproved = refs.some(
        (r) => r.status === ReferralStatus.APPROVED,
      );
      if (anyApproved) {
        await this.referralModel.updateOne(
          { _id: keep._id },
          { status: ReferralStatus.APPROVED, approvedAt: new Date() },
        );
      }
    }
  }

  // Keep one USER referral per referred user; delete duplicates; set APPROVED if any was approved
  private async normalizeUserReferrals(): Promise<void> {
    const userRefs = await this.referralModel
      .find({ type: ReferralType.USER })
      .sort({ createdAt: 1 })
      .lean();

    const byReferred = new Map<string, ReferralDocument[]>();
    for (const r of userRefs as any[]) {
      const key = r.referred.toString();
      const list = byReferred.get(key) || [];
      list.push(r as any);
      byReferred.set(key, list);
    }

    for (const [referredId, refs] of byReferred.entries()) {
      if (refs.length <= 1) continue;
      // Keep the first (oldest), delete others
      const keep = refs[0];
      const remove = refs.slice(1).map((r) => r._id);
      await this.referralModel.deleteMany({ _id: { $in: remove } });
      this.logger.log(
        `Deleted ${remove.length} duplicate user referrals for referred=${referredId}`,
      );
      // Ensure status consistency: if any duplicate had APPROVED, mark kept as APPROVED
      const anyApproved = refs.some(
        (r) => r.status === ReferralStatus.APPROVED,
      );
      if (anyApproved) {
        await this.referralModel.updateOne(
          { _id: keep._id },
          { status: ReferralStatus.APPROVED, approvedAt: new Date() },
        );
      }
    }
  }

  // Recalculate each user's referralBalance from referral transactions; fix duplicates
  private async recalculateReferralBalances(): Promise<void> {
    const users = await this.userModel.find({}, '_id referralBalance').lean();
    const userIds = users.map((u) => u._id.toString());

    for (const uid of userIds) {
      // Remove duplicate tx for same referralId
      const txs = await this.txModel
        .find({ user: uid, status: TransactionStatus.COMPLETED })
        .sort({ createdAt: 1 })
        .lean();

      const seenReferral = new Set<string>();
      const duplicates: string[] = [];
      for (const t of txs) {
        const rid = (t.referralId as any)?.toString?.();
        if (rid && seenReferral.has(rid)) {
          duplicates.push((t as any)._id.toString());
        } else if (rid) {
          seenReferral.add(rid);
        }
      }
      if (duplicates.length > 0) {
        await this.txModel.deleteMany({ _id: { $in: duplicates } });
        this.logger.log(
          `Deleted ${duplicates.length} duplicate referral tx for user=${uid}`,
        );
      }

      // Re-sum balance from remaining txs
      const remaining = await this.txModel
        .find({ user: uid, status: TransactionStatus.COMPLETED })
        .lean();
      const newBalance = remaining.reduce(
        (sum, t: any) => sum + (t.amount || 0),
        0,
      );
      await this.userModel.updateOne(
        { _id: uid },
        { referralBalance: newBalance },
      );
    }
  }
}
