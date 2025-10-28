import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Skip maintenance tasks in development to speed up startup
    const isDevelopment = this.configService.get('NODE_ENV') !== 'production';
    if (isDevelopment) {
      this.logger.log('⚡ Skipping referral maintenance in development mode for faster startup');
      return;
    }

    try {
      this.logger.log('🔧 Running referral maintenance tasks...');
      await this.normalizeSellerReferrals();
      await this.normalizeUserReferrals();
      await this.recalculateReferralBalances();
      this.logger.log('✅ Referral maintenance completed');
    } catch (e) {
      this.logger.warn(`Maintenance failed: ${e?.message || e}`);
    }
  }

  // Keep one SELLER referral per referred user; delete duplicates; set APPROVED if approvedAt exists
  private async normalizeSellerReferrals(): Promise<void> {
    // Use MongoDB aggregation to find duplicates directly in database (much faster)
    const duplicates = await this.referralModel.aggregate([
      { $match: { type: ReferralType.SELLER } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: '$referred',
          refs: { $push: '$$ROOT' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    if (duplicates.length === 0) {
      this.logger.log('No duplicate seller referrals found');
      return;
    }

    // Batch operations for better performance
    const bulkOps = [];
    let totalDeleted = 0;

    for (const dup of duplicates) {
      const refs = dup.refs;
      const keep = refs[0];
      const removeIds = refs.slice(1).map((r) => r._id);
      
      totalDeleted += removeIds.length;

      // Add delete operation to bulk
      bulkOps.push({
        deleteMany: { filter: { _id: { $in: removeIds } } },
      });

      // If any duplicate was APPROVED, update the kept one
      const anyApproved = refs.some((r) => r.status === ReferralStatus.APPROVED);
      if (anyApproved && keep.status !== ReferralStatus.APPROVED) {
        bulkOps.push({
          updateOne: {
            filter: { _id: keep._id },
            update: { status: ReferralStatus.APPROVED, approvedAt: new Date() },
          },
        });
      }
    }

    // Execute all operations in one batch
    if (bulkOps.length > 0) {
      await this.referralModel.bulkWrite(bulkOps);
      this.logger.log(`Deleted ${totalDeleted} duplicate seller referrals using bulk operations`);
    }
  }

  // Keep one USER referral per referred user; delete duplicates; set APPROVED if any was approved
  private async normalizeUserReferrals(): Promise<void> {
    // Use MongoDB aggregation to find duplicates directly in database (much faster)
    const duplicates = await this.referralModel.aggregate([
      { $match: { type: ReferralType.USER } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: '$referred',
          refs: { $push: '$$ROOT' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    if (duplicates.length === 0) {
      this.logger.log('No duplicate user referrals found');
      return;
    }

    // Batch operations for better performance
    const bulkOps = [];
    let totalDeleted = 0;

    for (const dup of duplicates) {
      const refs = dup.refs;
      const keep = refs[0];
      const removeIds = refs.slice(1).map((r) => r._id);
      
      totalDeleted += removeIds.length;

      // Add delete operation to bulk
      bulkOps.push({
        deleteMany: { filter: { _id: { $in: removeIds } } },
      });

      // If any duplicate was APPROVED, update the kept one
      const anyApproved = refs.some((r) => r.status === ReferralStatus.APPROVED);
      if (anyApproved && keep.status !== ReferralStatus.APPROVED) {
        bulkOps.push({
          updateOne: {
            filter: { _id: keep._id },
            update: { status: ReferralStatus.APPROVED, approvedAt: new Date() },
          },
        });
      }
    }

    // Execute all operations in one batch
    if (bulkOps.length > 0) {
      await this.referralModel.bulkWrite(bulkOps);
      this.logger.log(`Deleted ${totalDeleted} duplicate user referrals using bulk operations`);
    }
  }

  // Recalculate each user's referralBalance from referral transactions; fix duplicates
  private async recalculateReferralBalances(): Promise<void> {
    const BATCH_SIZE = 100; // Process users in batches to avoid memory issues
    let processedUsers = 0;
    let totalUpdated = 0;

    // Get total count for logging
    const totalUsers = await this.userModel.countDocuments();
    this.logger.log(`Processing ${totalUsers} users in batches of ${BATCH_SIZE}...`);

    // Process users in batches using cursor (memory efficient)
    const cursor = this.userModel.find({}, '_id referralBalance').lean().cursor();

    const batchPromises = [];
    let batchUsers = [];

    for await (const user of cursor) {
      batchUsers.push(user);

      if (batchUsers.length >= BATCH_SIZE) {
        batchPromises.push(this.processBatch(batchUsers));
        processedUsers += batchUsers.length;
        batchUsers = [];

        // Log progress every 500 users
        if (processedUsers % 500 === 0) {
          this.logger.log(`Processed ${processedUsers}/${totalUsers} users...`);
        }
      }
    }

    // Process remaining users
    if (batchUsers.length > 0) {
      batchPromises.push(this.processBatch(batchUsers));
      processedUsers += batchUsers.length;
    }

    const results = await Promise.all(batchPromises);
    totalUpdated = results.reduce((sum, count) => sum + count, 0);

    this.logger.log(
      `Balance recalculation complete: ${processedUsers} users processed, ${totalUpdated} balances updated`,
    );
  }

  private async processBatch(users: any[]): Promise<number> {
    const userIds = users.map((u) => u._id.toString());

    // Find all duplicate transactions for these users in one query
    const duplicateInfo = await this.txModel.aggregate([
      {
        $match: {
          user: { $in: userIds.map((id) => id) },
          status: TransactionStatus.COMPLETED,
          referralId: { $exists: true, $ne: null },
        },
      },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: { user: '$user', referralId: '$referralId' },
          txs: { $push: '$_id' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    // Collect duplicate IDs to delete (keep first, remove rest)
    const duplicatesToDelete = [];
    for (const dup of duplicateInfo) {
      duplicatesToDelete.push(...dup.txs.slice(1)); // Remove all except first
    }

    // Delete duplicates in one operation
    if (duplicatesToDelete.length > 0) {
      await this.txModel.deleteMany({ _id: { $in: duplicatesToDelete } });
      this.logger.log(`Deleted ${duplicatesToDelete.length} duplicate transactions`);
    }

    // Recalculate balances using aggregation (much faster than per-user queries)
    const balances = await this.txModel.aggregate([
      {
        $match: {
          user: { $in: userIds.map((id) => id) },
          status: TransactionStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: '$user',
          totalBalance: { $sum: '$amount' },
        },
      },
    ]);

    // Build bulk update operations
    const bulkOps = balances.map((bal) => ({
      updateOne: {
        filter: { _id: bal._id },
        update: { referralBalance: bal.totalBalance },
      },
    }));

    // Also reset balance to 0 for users with no transactions
    const usersWithBalance = new Set(balances.map((b) => b._id.toString()));
    for (const user of users) {
      if (!usersWithBalance.has(user._id.toString()) && user.referralBalance !== 0) {
        bulkOps.push({
          updateOne: {
            filter: { _id: user._id },
            update: { referralBalance: 0 },
          },
        });
      }
    }

    // Execute all updates in one batch
    if (bulkOps.length > 0) {
      await this.userModel.bulkWrite(bulkOps);
      return bulkOps.length;
    }

    return 0;
  }
}
