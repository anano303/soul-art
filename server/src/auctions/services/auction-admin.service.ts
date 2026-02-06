import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AuctionSettings,
  AuctionSettingsDocument,
} from '../schemas/auction-settings.schema';
import {
  AuctionAdminEarnings,
  AuctionAdminEarningsDocument,
} from '../schemas/auction-admin-earnings.schema';
import {
  AuctionAdminWithdrawal,
  AuctionAdminWithdrawalDocument,
  AuctionAdminWithdrawalStatus,
} from '../schemas/auction-admin-withdrawal.schema';
import { Auction, AuctionDocument } from '../schemas/auction.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class AuctionAdminService {
  private readonly logger = new Logger(AuctionAdminService.name);

  constructor(
    @InjectModel(AuctionSettings.name)
    private auctionSettingsModel: Model<AuctionSettingsDocument>,
    @InjectModel(AuctionAdminEarnings.name)
    private auctionAdminEarningsModel: Model<AuctionAdminEarningsDocument>,
    @InjectModel(AuctionAdminWithdrawal.name)
    private auctionAdminWithdrawalModel: Model<AuctionAdminWithdrawalDocument>,
    @InjectModel(Auction.name)
    private auctionModel: Model<AuctionDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  // Verify user has auction admin access
  private async verifyAuctionAdminAccess(userId: string): Promise<void> {
    // Check if user has auction_admin role
    const user = await this.userModel.findById(userId).lean();
    if (user && user.role === 'auction_admin') {
      // User has auction_admin role, allow access
      // Also ensure settings has this user set as admin
      const settings = await this.getSettings();
      if (!settings.auctionAdminUserId || settings.auctionAdminUserId.toString() !== userId) {
        // Auto-set this user as the auction admin in settings
        await this.auctionSettingsModel.updateOne(
          { key: 'auction_commission' },
          { $set: { auctionAdminUserId: new Types.ObjectId(userId) } },
        );
        this.logger.log(`Auto-assigned auction admin user: ${userId}`);
      }
      return;
    }

    // Fallback: check settings
    const settings = await this.getSettings();
    if (
      settings.auctionAdminUserId &&
      settings.auctionAdminUserId.toString() === userId
    ) {
      return;
    }

    throw new BadRequestException('You are not the auction admin');
  }

  // Get or create auction settings
  async getSettings(): Promise<AuctionSettingsDocument> {
    let settings = await this.auctionSettingsModel.findOne({
      key: 'auction_commission',
    });

    if (!settings) {
      settings = await this.auctionSettingsModel.create({
        key: 'auction_commission',
        platformCommissionPercent: 10,
        auctionAdminCommissionPercent: 30,
      });
    }

    return settings;
  }

  // Update auction settings (Admin only)
  async updateSettings(
    adminId: string,
    data: {
      platformCommissionPercent?: number;
      auctionAdminCommissionPercent?: number;
      auctionAdminUserId?: string;
    },
  ): Promise<AuctionSettingsDocument> {
    const settings = await this.getSettings();

    if (data.platformCommissionPercent !== undefined) {
      if (data.platformCommissionPercent < 0 || data.platformCommissionPercent > 100) {
        throw new BadRequestException('Platform commission must be between 0 and 100');
      }
      settings.platformCommissionPercent = data.platformCommissionPercent;
    }

    if (data.auctionAdminCommissionPercent !== undefined) {
      if (data.auctionAdminCommissionPercent < 0 || data.auctionAdminCommissionPercent > 100) {
        throw new BadRequestException('Auction admin commission must be between 0 and 100');
      }
      settings.auctionAdminCommissionPercent = data.auctionAdminCommissionPercent;
    }

    if (data.auctionAdminUserId) {
      settings.auctionAdminUserId = new Types.ObjectId(data.auctionAdminUserId);
    }

    settings.updatedBy = new Types.ObjectId(adminId);
    await settings.save();

    this.logger.log(`Auction settings updated by admin: ${adminId}`);
    return settings;
  }

  // Record auction admin earnings when an auction is paid
  async recordEarnings(
    auctionId: string,
    saleAmount: number,
    sellerId: string,
    sellerName: string,
    buyerId: string,
    buyerName: string,
    auctionTitle: string,
  ): Promise<AuctionAdminEarningsDocument | null> {
    const settings = await this.getSettings();

    if (!settings.auctionAdminUserId) {
      this.logger.warn('No auction admin configured, skipping earnings record');
      return null;
    }

    // Check if earnings already recorded for this auction
    const existing = await this.auctionAdminEarningsModel.findOne({
      auctionId: new Types.ObjectId(auctionId),
    });

    if (existing) {
      this.logger.warn(`Earnings already recorded for auction: ${auctionId}`);
      return existing;
    }

    // NEW CALCULATION: Auction admin gets percentage directly from sale price
    // Example: 30% of 1000 = 300 GEL
    const auctionAdminEarnings =
      (saleAmount * settings.auctionAdminCommissionPercent) / 100;

    // Platform gets its percentage directly from sale price
    // Example: 10% of 1000 = 100 GEL
    const platformCommissionAmount =
      (saleAmount * settings.platformCommissionPercent) / 100;

    const earnings = await this.auctionAdminEarningsModel.create({
      auctionAdminId: settings.auctionAdminUserId,
      auctionId: new Types.ObjectId(auctionId),
      saleAmount,
      platformCommissionAmount,
      auctionAdminCommissionPercent: settings.auctionAdminCommissionPercent,
      auctionAdminEarnings,
      sellerId: new Types.ObjectId(sellerId),
      sellerName,
      buyerId: new Types.ObjectId(buyerId),
      buyerName,
      auctionTitle,
      paidAt: new Date(),
    });

    // Update auction admin's balance
    await this.userModel.updateOne(
      { _id: settings.auctionAdminUserId },
      {
        $inc: {
          auctionAdminBalance: auctionAdminEarnings,
          auctionAdminTotalEarnings: auctionAdminEarnings,
        },
      },
    );

    this.logger.log(
      `Auction admin earnings recorded: ${auctionAdminEarnings} GEL for auction ${auctionId}`,
    );

    return earnings;
  }

  // Get auction admin's dashboard data
  async getAuctionAdminDashboard(auctionAdminId: string) {
    // Verify this user is the auction admin
    await this.verifyAuctionAdminAccess(auctionAdminId);
    const settings = await this.getSettings();

    // Get all earnings
    const earnings = await this.auctionAdminEarningsModel
      .find({ auctionAdminId: new Types.ObjectId(auctionAdminId) })
      .sort({ createdAt: -1 })
      .lean();

    // Calculate totals
    const totalSales = earnings.reduce((sum, e) => sum + e.saleAmount, 0);
    const totalPlatformCommission = earnings.reduce(
      (sum, e) => sum + e.platformCommissionAmount,
      0,
    );
    const totalEarnings = earnings.reduce(
      (sum, e) => sum + e.auctionAdminEarnings,
      0,
    );
    const withdrawnEarnings = earnings
      .filter((e) => e.isWithdrawn)
      .reduce((sum, e) => sum + e.auctionAdminEarnings, 0);
    const pendingEarnings = totalEarnings - withdrawnEarnings;

    // Get recent completed auctions
    const completedAuctions = await this.auctionModel
      .find({ status: 'ENDED', isPaid: true })
      .populate('seller', 'name ownerFirstName ownerLastName storeName')
      .populate('currentWinner', 'name ownerFirstName ownerLastName')
      .sort({ endedAt: -1 })
      .limit(50)
      .lean();

    return {
      settings: {
        platformCommissionPercent: settings.platformCommissionPercent,
        auctionAdminCommissionPercent: settings.auctionAdminCommissionPercent,
      },
      summary: {
        totalAuctionsSold: earnings.length,
        totalSales,
        totalPlatformCommission,
        totalEarnings,
        withdrawnEarnings,
        pendingEarnings,
      },
      recentEarnings: earnings.slice(0, 20),
      completedAuctions,
    };
  }

  // Get all paid auctions with buyer/seller info (for auction admin)
  async getPaidAuctions(
    auctionAdminId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // Verify this user is the auction admin
    await this.verifyAuctionAdminAccess(auctionAdminId);

    const skip = (page - 1) * limit;

    const [auctions, total] = await Promise.all([
      this.auctionModel
        .find({ status: 'ENDED', isPaid: true })
        .populate('seller', 'name ownerFirstName ownerLastName storeName email phone')
        .populate('currentWinner', 'name ownerFirstName ownerLastName email phone')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.auctionModel.countDocuments({ status: 'ENDED', isPaid: true }),
    ]);

    // Enrich with earnings data
    const auctionIds = auctions.map((a) => a._id);
    const earningsMap = new Map();
    const earningsRecords = await this.auctionAdminEarningsModel
      .find({ auctionId: { $in: auctionIds } })
      .lean();

    earningsRecords.forEach((e) => {
      earningsMap.set(e.auctionId.toString(), e);
    });

    const enrichedAuctions = auctions.map((auction) => ({
      ...auction,
      earningsData: earningsMap.get(auction._id.toString()) || null,
    }));

    return {
      auctions: enrichedAuctions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    };
  }

  // Get earnings history
  async getEarningsHistory(
    auctionAdminId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    await this.verifyAuctionAdminAccess(auctionAdminId);

    const skip = (page - 1) * limit;

    const [earnings, total] = await Promise.all([
      this.auctionAdminEarningsModel
        .find({ auctionAdminId: new Types.ObjectId(auctionAdminId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.auctionAdminEarningsModel.countDocuments({
        auctionAdminId: new Types.ObjectId(auctionAdminId),
      }),
    ]);

    return {
      earnings,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    };
  }

  // Get auction admin profile with bank details
  async getProfile(auctionAdminId: string) {
    const user = await this.userModel.findById(auctionAdminId).lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      identificationNumber: user.identificationNumber || null,
      accountNumber: user.accountNumber || null,
      beneficiaryBankCode: user.beneficiaryBankCode || null,
      phoneNumber: user.phoneNumber || null,
      auctionAdminBalance: user.auctionAdminBalance || 0,
      auctionAdminPendingWithdrawal: user.auctionAdminPendingWithdrawal || 0,
      auctionAdminTotalEarnings: user.auctionAdminTotalEarnings || 0,
      auctionAdminTotalWithdrawn: user.auctionAdminTotalWithdrawn || 0,
    };
  }

  // Update auction admin profile (bank details)
  async updateProfile(
    auctionAdminId: string,
    data: {
      identificationNumber?: string;
      accountNumber?: string;
      beneficiaryBankCode?: string;
      phoneNumber?: string;
    },
  ) {
    const user = await this.userModel.findById(auctionAdminId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (data.identificationNumber !== undefined) {
      user.identificationNumber = data.identificationNumber;
    }
    if (data.accountNumber !== undefined) {
      user.accountNumber = data.accountNumber;
    }
    if (data.beneficiaryBankCode !== undefined) {
      user.beneficiaryBankCode = data.beneficiaryBankCode;
    }
    if (data.phoneNumber !== undefined) {
      user.phoneNumber = data.phoneNumber;
    }

    await user.save();
    this.logger.log(`Auction admin profile updated: ${auctionAdminId}`);

    return this.getProfile(auctionAdminId);
  }

  // Request withdrawal
  async requestWithdrawal(auctionAdminId: string, amount?: number) {
    const user = await this.userModel.findById(auctionAdminId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate bank details
    if (!user.identificationNumber || !user.accountNumber) {
      throw new BadRequestException(
        'Please update your profile with identification number and bank account before requesting withdrawal',
      );
    }

    // Get available earnings (not withdrawn)
    const availableEarnings = await this.auctionAdminEarningsModel
      .find({
        auctionAdminId: new Types.ObjectId(auctionAdminId),
        isWithdrawn: false,
      })
      .lean();

    const totalAvailable = availableEarnings.reduce(
      (sum, e) => sum + e.auctionAdminEarnings,
      0,
    );

    const withdrawAmount = amount || totalAvailable;

    if (withdrawAmount < 50) {
      throw new BadRequestException('Minimum withdrawal amount is 50 GEL');
    }

    if (withdrawAmount > totalAvailable) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${totalAvailable.toFixed(2)} GEL`,
      );
    }

    // Check for pending withdrawal
    const pendingWithdrawal = await this.auctionAdminWithdrawalModel.findOne({
      auctionAdminId: new Types.ObjectId(auctionAdminId),
      status: AuctionAdminWithdrawalStatus.PENDING,
    });

    if (pendingWithdrawal) {
      throw new BadRequestException(
        'You already have a pending withdrawal request',
      );
    }

    // Select earnings to include (oldest first, up to withdraw amount)
    let amountToAllocate = withdrawAmount;
    const earningsToInclude: Types.ObjectId[] = [];
    
    // Sort by creation date ascending (oldest first)
    const sortedEarnings = availableEarnings.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    for (const earning of sortedEarnings) {
      if (amountToAllocate <= 0) break;
      earningsToInclude.push(earning._id as Types.ObjectId);
      amountToAllocate -= earning.auctionAdminEarnings;
    }

    // Create withdrawal request
    const withdrawal = await this.auctionAdminWithdrawalModel.create({
      auctionAdminId: new Types.ObjectId(auctionAdminId),
      amount: withdrawAmount,
      accountNumber: user.accountNumber,
      accountHolderName: user.name,
      identificationNumber: user.identificationNumber,
      beneficiaryBankCode: user.beneficiaryBankCode,
      earningsIncluded: earningsToInclude,
    });

    // Update user pending withdrawal
    await this.userModel.updateOne(
      { _id: auctionAdminId },
      {
        $inc: {
          auctionAdminPendingWithdrawal: withdrawAmount,
        },
      },
    );

    // Mark earnings as withdrawn (pending)
    await this.auctionAdminEarningsModel.updateMany(
      { _id: { $in: earningsToInclude } },
      { isWithdrawn: true },
    );

    this.logger.log(
      `Auction admin withdrawal requested: ${withdrawAmount} GEL by ${auctionAdminId}`,
    );

    return withdrawal;
  }

  // Get withdrawal history
  async getWithdrawalHistory(
    auctionAdminId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      this.auctionAdminWithdrawalModel
        .find({ auctionAdminId: new Types.ObjectId(auctionAdminId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.auctionAdminWithdrawalModel.countDocuments({
        auctionAdminId: new Types.ObjectId(auctionAdminId),
      }),
    ]);

    return {
      withdrawals,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    };
  }

  // Admin: Get all pending withdrawals
  async getAllPendingWithdrawals(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      this.auctionAdminWithdrawalModel
        .find({ status: AuctionAdminWithdrawalStatus.PENDING })
        .populate('auctionAdminId', 'name email phoneNumber')
        .sort({ createdAt: 1 }) // Oldest first
        .skip(skip)
        .limit(limit)
        .lean(),
      this.auctionAdminWithdrawalModel.countDocuments({
        status: AuctionAdminWithdrawalStatus.PENDING,
      }),
    ]);

    return {
      withdrawals,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    };
  }

  // Admin: Process withdrawal (approve/reject)
  async processWithdrawal(
    adminId: string,
    withdrawalId: string,
    action: 'approve' | 'reject',
    transactionId?: string,
    rejectionReason?: string,
  ) {
    const withdrawal = await this.auctionAdminWithdrawalModel.findById(withdrawalId);
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawal.status !== AuctionAdminWithdrawalStatus.PENDING) {
      throw new BadRequestException('This withdrawal has already been processed');
    }

    if (action === 'approve') {
      withdrawal.status = AuctionAdminWithdrawalStatus.PROCESSED;
      withdrawal.processedAt = new Date();
      withdrawal.processedBy = new Types.ObjectId(adminId);
      withdrawal.transactionId = transactionId;

      // Update user balances
      await this.userModel.updateOne(
        { _id: withdrawal.auctionAdminId },
        {
          $inc: {
            auctionAdminPendingWithdrawal: -withdrawal.amount,
            auctionAdminTotalWithdrawn: withdrawal.amount,
          },
        },
      );

      // Mark earnings as withdrawn with date
      await this.auctionAdminEarningsModel.updateMany(
        { _id: { $in: withdrawal.earningsIncluded } },
        { withdrawnAt: new Date() },
      );

      this.logger.log(
        `Auction admin withdrawal approved: ${withdrawal.amount} GEL, ID: ${withdrawalId}`,
      );
    } else {
      withdrawal.status = AuctionAdminWithdrawalStatus.REJECTED;
      withdrawal.processedAt = new Date();
      withdrawal.processedBy = new Types.ObjectId(adminId);
      withdrawal.rejectionReason = rejectionReason;

      // Restore pending withdrawal
      await this.userModel.updateOne(
        { _id: withdrawal.auctionAdminId },
        {
          $inc: {
            auctionAdminPendingWithdrawal: -withdrawal.amount,
          },
        },
      );

      // Unmark earnings as withdrawn
      await this.auctionAdminEarningsModel.updateMany(
        { _id: { $in: withdrawal.earningsIncluded } },
        { isWithdrawn: false, withdrawnAt: null },
      );

      this.logger.log(
        `Auction admin withdrawal rejected: ${withdrawal.amount} GEL, ID: ${withdrawalId}`,
      );
    }

    await withdrawal.save();
    return withdrawal;
  }
}
