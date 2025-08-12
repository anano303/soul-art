import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  forwardRef,
  Inject,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import {
  Referral,
  ReferralDocument,
  ReferralStatus,
  ReferralType,
} from '../schemas/referral.schema';
import {
  ReferralBalanceTransaction,
  ReferralBalanceTransactionDocument,
  TransactionType,
  TransactionStatus,
} from '../schemas/balance-transaction.schema';
import {
  WithdrawalRequest,
  WithdrawalRequestDocument,
  WithdrawalStatus,
} from '../schemas/withdrawal-request.schema';
import {
  CreateWithdrawalRequestDto,
  ProcessWithdrawalDto,
} from '../dtos/referral.dto';
import { ProductStatus } from '../../products/schemas/product.schema';
import { Role } from '../../types/role.enum';
import { ProductsService } from '@/products/services/products.service';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Referral.name) private referralModel: Model<ReferralDocument>,
    @InjectModel(ReferralBalanceTransaction.name)
    private balanceTransactionModel: Model<ReferralBalanceTransactionDocument>,
    @InjectModel(WithdrawalRequest.name)
    private withdrawalRequestModel: Model<WithdrawalRequestDocument>,
    @Optional()
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService?: ProductsService,
  ) {}

  // რეფერალური კოდის გენერაცია
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // მომხმარებლისთვის რეფერალური კოდის შექმნა
  async generateUserReferralCode(userId: string): Promise<string> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');
    }

    if (user.referralCode) {
      return user.referralCode;
    }

    let referralCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      referralCode = this.generateReferralCode();
      attempts++;

      const existingUser = await this.userModel.findOne({ referralCode });
      if (!existingUser) {
        break;
      }

      if (attempts >= maxAttempts) {
        throw new BadRequestException('რეფერალური კოდის გენერაციის შეცდომა');
      }
    } while (true);

    await this.userModel.findByIdAndUpdate(userId, { referralCode });
    return referralCode;
  }

  // რეფერალური კოდით რეგისტრაცია
  async registerWithReferralCode(
    referredUserId: string,
    referralCode: string,
  ): Promise<void> {
    this.logger.log(
      `registerWithReferralCode started: userId=${referredUserId}, code=${referralCode}`,
    );

    if (!referralCode) {
      this.logger.log('No referral code provided, skipping');
      return;
    }

    const referrer = await this.userModel.findOne({ referralCode });
    if (!referrer) {
      this.logger.warn(`არასწორი რეფერალური კოდი: ${referralCode}`);
      return;
    }

    this.logger.log(`Referrer found: ${referrer.email}`);

    const referredUser = await this.userModel.findById(referredUserId);
    if (!referredUser) {
      this.logger.error(
        `მოწვეული მომხმარებელი ვერ მოიძებნა: ${referredUserId}`,
      );
      throw new NotFoundException('მოწვეული მომხმარებელი ვერ მოიძებნა');
    }

    this.logger.log(`Referred user found: ${referredUser.email}`);

    // შევამოწმოთ არ არსებობს თუ არა ხელახლა რეფერალი ამ მომხმარებლისთვის
    const existingReferral = await this.referralModel.findOne({
      referred: referredUserId,
    });
    if (existingReferral) {
      this.logger.warn(
        `Referral already exists for user: ${referredUser.email}`,
      );
      return; // არ შევქმნით ახალ რეფერალს
    }

    // შეამოწმოთ, რომ იგივე პირი არ მოიწვიოს თავის თავს
    if (referrer._id.toString() === referredUserId) {
      this.logger.error(`Self-referral attempt: ${referrer.email}`);
      throw new BadRequestException('თავის თავის მოწვევა არ შეიძლება');
    }

    // განსაზღვროთ რეფერალის ტიპი და ბონუსი
    const referralType =
      referredUser.role === Role.Seller
        ? ReferralType.SELLER
        : ReferralType.USER;
    const bonusAmount = referralType === ReferralType.SELLER ? 5 : 0.2; // 5 ლარი ან 20 თეთრი
    const initialStatus =
      referralType === ReferralType.USER
        ? ReferralStatus.APPROVED // მომხმარებლის შემთხვევაში პირდაპირ ვამტკიცებთ
        : ReferralStatus.PENDING;

    this.logger.log(
      `Creating referral: type=${referralType}, bonus=${bonusAmount}`,
    );

    // შევქმნათ რეფერალის ჩანაწერი
    const referral = new this.referralModel({
      referrer: referrer._id,
      referred: referredUser._id,
      type: referralType,
      bonusAmount,
      status: initialStatus,
      approvedAt:
        initialStatus === ReferralStatus.APPROVED ? new Date() : undefined,
    });

    try {
      await referral.save();
      this.logger.log(`Referral saved successfully`);
    } catch (error) {
      this.logger.error(`Failed to save referral: ${error.message}`);
      throw error;
    }

    // ავფეიროთ მოწვეული მომხმარებლის ველი
    try {
      await this.userModel.findByIdAndUpdate(referredUserId, {
        referredBy: referralCode,
      });
      this.logger.log(`User updated with referral code`);
    } catch (error) {
      this.logger.error(
        `Failed to update user with referral code: ${error.message}`,
      );
      throw error;
    }

    this.logger.log(
      `რეფერალი შექმნილია: ${referrer.email} -> ${referredUser.email} (${referralType})`,
    );

    // თუ ტიპი USER იყო, ბონუსი დაუყოვნებლივ ჩაირიცხოს
    if (initialStatus === ReferralStatus.APPROVED) {
      try {
        await this.addBalance(
          referrer._id.toString(),
          bonusAmount,
          TransactionType.REFERRAL_BONUS,
          `რეფერალური ბონუსი მომხმარებლისთვის: ${referredUser.email}`,
          referral._id.toString(),
        );
        this.logger.log(
          `რეფერალური ბონუსი (USER) გადაცემულია: ${referrer.email} -> ${bonusAmount} ლარი`,
        );
      } catch (error) {
        this.logger.error(
          `USER ბონუსის ჩარიცხვის შეცდომა: ${error?.message || error}`,
        );
      }
    }
  }

  // სელერის დამტკიცება და ბონუსის გადაცემა
  async approveSellerAndPayBonus(sellerId: string): Promise<void> {
    this.logger.log(`[approveSellerAndPayBonus] start sellerId=${sellerId}`);
    const seller = await this.userModel.findById(sellerId);
    if (!seller || seller.role !== Role.Seller) {
      throw new NotFoundException('სელერი ვერ მოიძებნა');
    }

    // შევამოწმოთ, რომ სელერს აქვს მინიმუმ 5 დამტკიცებული პროდუქტი
    let approvedProductsCount = 0;
    if (this.productsService) {
      try {
        approvedProductsCount = await this.productsService.countUserProducts(
          sellerId,
          ProductStatus.APPROVED,
        );
        this.logger.log(
          `[approveSellerAndPayBonus] approvedProducts=${approvedProductsCount} for seller=${seller.email}`,
        );
      } catch (error) {
        this.logger.warn(
          `პროდუქტების რაოდენობის დათვლის შეცდომა: ${error.message}`,
        );
        return; // თუ პროდუქტების service არ მუშაობს, არ ვაკეთებთ ბონუსის გადაცემას
      }
    } else {
      this.logger.warn('ProductsService არ არის ხელმისაწვდომი');
      return;
    }

    if (approvedProductsCount < 5) {
      // საკმარისი დამტკიცებული პროდუქტი ჯერ არ აქვს — უბრალოდ დავბრუნდეთ უხმაუროდ
      this.logger.log(
        `Seller ${seller.email} has ${approvedProductsCount} approved products (<5). Skipping approval for now.`,
      );
      return;
    }

    // ვეძებთ ამ სელერის ყველა რეფერალს (დუბლიკატების შემთხვევისთვისაც)
    let referrals = await this.referralModel
      .find({
        referred: sellerId,
        type: ReferralType.SELLER,
      })
      .populate('referrer');

    if (!referrals || referrals.length === 0) {
      this.logger.warn(
        `[approveSellerAndPayBonus] referral not found for sellerId=${sellerId}. Will backfill from user.referredBy if possible.`,
      );
      // Backfill referral from referrer code if present
      if (seller.referredBy) {
        const referrer = await this.userModel.findOne({
          referralCode: seller.referredBy,
        });
        if (referrer) {
          const referral = new this.referralModel({
            referrer: referrer._id,
            referred: seller._id,
            type: ReferralType.SELLER,
            bonusAmount: 5,
            status: ReferralStatus.PENDING,
          });
          await referral.save();
          this.logger.log(
            '[approveSellerAndPayBonus] backfilled seller referral',
          );
          const populated = await this.referralModel
            .findById(referral._id)
            .populate('referrer');
          referrals.push(populated as any);
        } else {
          this.logger.warn(
            `[approveSellerAndPayBonus] referrer not found by code=${seller.referredBy}`,
          );
        }
      }
      if (!referrals || referrals.length === 0) return;
    }

    // დუბლიკატების გაწმენდა: დავტოვოთ ყველაზე ძველი referral, სხვები წავშალოთ
    referrals = referrals.sort(
      (a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const primaryReferral = referrals[0];
    const duplicateIds = referrals.slice(1).map((r) => r._id);
    if (duplicateIds.length > 0) {
      await this.referralModel.deleteMany({ _id: { $in: duplicateIds } });
      this.logger.log(
        `[approveSellerAndPayBonus] removed ${duplicateIds.length} duplicate seller referrals`,
      );
    }

    // მთავარის სტატუსი გადავიყვანოთ APPROVED-ზე
    const now = new Date();
    if (primaryReferral.status !== ReferralStatus.APPROVED) {
      primaryReferral.status = ReferralStatus.APPROVED;
      primaryReferral.approvedAt = now;
      await primaryReferral.save();
    }

    // ბონუსის ჩარიცხვა მხოლოდ ერთხელ, თუ ჯერ არ ჩარიცხულა
    const anyReferral = primaryReferral;
    const referrer = primaryReferral.referrer as UserDocument;
    const existingTx = await this.balanceTransactionModel.findOne({
      user: referrer._id,
      type: TransactionType.REFERRAL_BONUS,
      referralId: anyReferral._id,
    });

    if (!existingTx) {
      await this.addBalance(
        referrer._id.toString(),
        anyReferral.bonusAmount,
        TransactionType.REFERRAL_BONUS,
        `რეფერალური ბონუსი სელერისთვის: ${seller.email}`,
        anyReferral._id.toString(),
      );

      this.logger.log(
        `რეფერალური ბონუსი გადაცემულია: ${referrer.email} -> ${anyReferral.bonusAmount} ლარი`,
      );
    } else {
      this.logger.log('ბონუსი უკვე ჩარიცხულია, ვტოვებთ როგორც არის');
    }

    // ვაფდეითებთ სელერის დამტკიცების თარიღს
    await this.userModel.findByIdAndUpdate(sellerId, {
      sellerApprovedAt: new Date(),
    });
  }

  // ბალანსის დამატება
  private async addBalance(
    userId: string,
    amount: number,
    type: TransactionType,
    description: string,
    referralId?: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');
    }

    const balanceBefore = user.referralBalance || 0;
    const balanceAfter = balanceBefore + amount;

    // ვაფდეითებთ მომხმარებლის რეფერალების ბალანსს
    await this.userModel.findByIdAndUpdate(userId, {
      referralBalance: balanceAfter,
      $inc: {
        totalReferrals: type === TransactionType.REFERRAL_BONUS ? 1 : 0,
        totalEarnings: amount,
      },
    });

    // ვქმნით ტრანზაქციის ჩანაწერს
    const transaction = new this.balanceTransactionModel({
      user: userId,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      status: TransactionStatus.COMPLETED,
      description,
      referralId,
    });

    await transaction.save();
  }

  // ბალანსის გატანის მოთხოვნა
  async createWithdrawalRequest(
    userId: string,
    createWithdrawalDto: CreateWithdrawalRequestDto,
  ): Promise<WithdrawalRequest> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');
    }

    // შევამოწმოთ რეფერალების ბალანსი
    if ((user.referralBalance || 0) < createWithdrawalDto.amount) {
      throw new BadRequestException('არასაკმარისი რეფერალების ბალანსი');
    }

    // შევამოწმოთ მინიმუმ თანხა
    if (createWithdrawalDto.amount < 50) {
      throw new BadRequestException('მინიმუმ გასატანი თანხა არის 50 ლარი');
    }

    // შევამოწმოთ 30 დღიანი ლიმიტი
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (user.createdAt > thirtyDaysAgo) {
      throw new BadRequestException(
        'ბალანსის გატანა შესაძლებელია რეგისტრაციიდან 30 დღის შემდეგ',
      );
    }

    // შევამოწმოთ თვიური ლიმიტი (2 გატანა თვეში)
    await this.checkMonthlyWithdrawalLimit(userId);

    const withdrawalRequest = new this.withdrawalRequestModel({
      user: userId,
      amount: createWithdrawalDto.amount,
      method: createWithdrawalDto.method,
      accountDetails: createWithdrawalDto.accountDetails,
    });

    return await withdrawalRequest.save();
  }

  // თვიური გატანის ლიმიტის შემოწმება
  private async checkMonthlyWithdrawalLimit(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // თუ ახალი თვეა, ვრესეტავთ counter-ს
    if (
      !user.lastWithdrawalReset ||
      user.lastWithdrawalReset.getMonth() !== currentMonth ||
      user.lastWithdrawalReset.getFullYear() !== currentYear
    ) {
      await this.userModel.findByIdAndUpdate(userId, {
        monthlyWithdrawals: 0,
        lastWithdrawalReset: now,
      });
      user.monthlyWithdrawals = 0;
    }

    if (user.monthlyWithdrawals >= 2) {
      throw new BadRequestException('თვეში მაქსიმუმ 2 გატანაა შესაძლებელი');
    }
  }

  // გატანის მოთხოვნის დამუშავება (ადმინისთვის)
  async processWithdrawalRequest(
    requestId: string,
    processWithdrawalDto: ProcessWithdrawalDto,
    adminId: string,
  ): Promise<WithdrawalRequest> {
    const request = await this.withdrawalRequestModel
      .findById(requestId)
      .populate('user');
    if (!request) {
      throw new NotFoundException('გატანის მოთხოვნა ვერ მოიძებნა');
    }

    if (request.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('ეს მოთხოვნა უკვე დამუშავებულია');
    }

    const now = new Date();

    if (processWithdrawalDto.status === 'APPROVED') {
      const user = request.user as UserDocument;

      // შევამოწმოთ რეფერალების ბალანსი ისევ
      if ((user.referralBalance || 0) < request.amount) {
        throw new BadRequestException(
          'მომხმარებელს არასაკმარისი რეფერალების ბალანსი აქვს',
        );
      }

      // ვაკლებთ თანხას ბალანსიდან
      await this.subtractBalance(
        user._id.toString(),
        request.amount,
        TransactionType.WITHDRAWAL,
        `ბალანსის გატანა ${request.method}`,
        requestId,
      );

      // ვზრდით თვიური გატანების რაოდენობას
      await this.userModel.findByIdAndUpdate(user._id, {
        $inc: { monthlyWithdrawals: 1 },
      });

      request.status = WithdrawalStatus.PROCESSED;
      request.transactionId = processWithdrawalDto.transactionId;
    } else {
      request.status = WithdrawalStatus.REJECTED;
      request.rejectionReason = processWithdrawalDto.rejectionReason;
    }

    request.processedAt = now;
    request.processedBy = adminId as any;

    return await request.save();
  }

  // ბალანსის გამოკლება
  private async subtractBalance(
    userId: string,
    amount: number,
    type: TransactionType,
    description: string,
    referenceId?: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');
    }

    const balanceBefore = user.referralBalance || 0;
    const balanceAfter = balanceBefore - amount;

    if (balanceAfter < 0) {
      throw new BadRequestException('არასაკმარისი რეფერალების ბალანსი');
    }

    // ვაფდეითებთ მომხმარებლის რეფერალების ბალანსს
    await this.userModel.findByIdAndUpdate(userId, {
      referralBalance: balanceAfter,
    });

    // ვქმნით ტრანზაქციის ჩანაწერს
    const transaction = new this.balanceTransactionModel({
      user: userId,
      type,
      amount: -amount, // უარყოფითი, რადგან ხარჯია
      balanceBefore,
      balanceAfter,
      status: TransactionStatus.COMPLETED,
      description,
    });

    await transaction.save();
  }

  // მომხმარებლის რეფერალების სტატისტიკა
  async getUserReferralStats(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');
    }

    // თუ მომხმარებელს არ აქვს რეფერალური კოდი, შევქმნათ
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = await this.generateUserReferralCode(userId);
    }

    // ძირითადი წყარო: რეფერალების კოლექცია
    const referrals = await this.referralModel
      .find({ referrer: userId })
      .populate('referred', 'name email role createdAt')
      .sort({ createdAt: -1 });

    this.logger.log(
      `[getUserReferralStats] Found ${referrals.length} real referrals for user ${userId}`,
    );
    for (const r of referrals) {
      this.logger.log(
        `[getUserReferralStats] Referral ${r._id}: type=${r.type}, status=${r.status}, referred=${(r.referred as any)?._id || r.referred}`,
      );
    }

    // უზრუნველვყოთ, რომ USER ტიპის APPROVED რეფერალებზე ბონუსი ჩაირიცხოს
    try {
      const approvedUserReferrals = referrals.filter(
        (r) =>
          r.status === ReferralStatus.APPROVED && r.type === ReferralType.USER,
      );

      if (approvedUserReferrals.length > 0) {
        const paidTx = await this.balanceTransactionModel
          .find({
            user: userId,
            type: TransactionType.REFERRAL_BONUS,
            referralId: { $ne: null },
          })
          .select('referralId')
          .lean();

        const paidReferralIds = new Set<string>(
          paidTx
            .map((t: any) => (t.referralId || '').toString())
            .filter(Boolean),
        );

        for (const r of approvedUserReferrals) {
          const rid = (r._id || '').toString();
          if (!paidReferralIds.has(rid)) {
            await this.addBalance(
              userId,
              r.bonusAmount,
              TransactionType.REFERRAL_BONUS,
              `რეფერალური ბონუსი მომხმარებლისთვის: ${(r.referred as any)?.email || ''}`,
              rid,
            );
            paidReferralIds.add(rid);
          }
        }
      }
    } catch (e) {
      this.logger.warn(
        `Auto-credit for approved USER referrals failed: ${e?.message || e}`,
      );
    }

    // მოვძებნოთ მომხმარებლები, ვისაც მითითებული აქვს ეს referralCode
    const invitedUsers = await this.userModel
      .find({ referredBy: referralCode })
      .select('name email role createdAt _id')
      .lean();

    this.logger.log(
      `[getUserReferralStats] Found ${invitedUsers.length} invited users with referralCode ${referralCode}`,
    );
    for (const iu of invitedUsers) {
      this.logger.log(
        `[getUserReferralStats] Invited user ${iu._id}: role=${iu.role}, email=${iu.email}`,
      );
    }

    // ავაგოთ საბოლოო სია: რეალური Referral-ები + სინთეზური მხოლოდ მათზე, ვისაც რეალური არ აქვს
    const realReferralIds = new Set(
      referrals
        .map((r) => {
          const referredValue: any = (r as any).referred;
          // Handle both populated and unpopulated referred fields
          if (
            referredValue &&
            typeof referredValue === 'object' &&
            referredValue._id
          ) {
            return referredValue._id.toString();
          } else if (referredValue) {
            return referredValue.toString();
          }
          return null;
        })
        .filter(Boolean),
    );

    const merged: any[] = [];

    // 1. დავამატოთ ყველა რეალური Referral
    for (const r of referrals) {
      merged.push({
        id: r._id.toString(),
        referred: r.referred as any,
        type: r.type,
        status: r.status,
        bonusAmount: r.bonusAmount,
        createdAt: r.createdAt,
        approvedAt: r.approvedAt,
      });
    }

    // 2. დავამატოთ სინთეზური მხოლოდ მათზე, ვისაც რეალური არ აქვს
    for (const iu of invitedUsers) {
      const invitedId = iu._id.toString();
      if (realReferralIds.has(invitedId)) continue;

      // For sellers, check if they should actually be approved
      let status = ReferralStatus.PENDING;
      let approvedAt = undefined;

      if (iu.role === Role.Seller) {
        // Check if seller has 5+ approved products
        if (this.productsService) {
          try {
            const approvedProductsCount =
              await this.productsService.countUserProducts(
                invitedId,
                ProductStatus.APPROVED,
              );
            if (approvedProductsCount >= 5) {
              status = ReferralStatus.APPROVED;
              approvedAt = new Date();
            }
          } catch (error) {
            this.logger.warn(
              `Failed to check seller approval status for ${iu.email}: ${error.message}`,
            );
          }
        }
      } else {
        // Users are automatically approved
        status = ReferralStatus.APPROVED;
        approvedAt = iu.createdAt;
      }

      merged.push({
        id: invitedId,
        referred: iu as any,
        type: iu.role === Role.Seller ? ReferralType.SELLER : ReferralType.USER,
        status,
        bonusAmount: iu.role === Role.Seller ? 5 : 0.2,
        createdAt: iu.createdAt,
        approvedAt,
      });
    }

    const combinedReferrals = merged;

    this.logger.log(
      `[getUserReferralStats] Final combined referrals: ${combinedReferrals.length}`,
    );
    for (const r of combinedReferrals) {
      this.logger.log(
        `[getUserReferralStats] Combined referral ${r.id}: type=${r.type}, status=${r.status}, bonusAmount=${r.bonusAmount}`,
      );
    }

    // თანხების გამოთვლა მხოლოდ რეალურად დამტკიცებულ რეფერალებზე
    const totalEarnings = combinedReferrals
      .filter((r) => r.status === ReferralStatus.APPROVED)
      .reduce((sum, r) => sum + r.bonusAmount, 0);

    const pendingEarnings = combinedReferrals
      .filter(
        (r) =>
          r.status === ReferralStatus.PENDING ||
          r.status === ReferralStatus.PRODUCTS_UPLOADED,
      )
      .reduce((sum, r) => sum + r.bonusAmount, 0);

    // ბალანსი = დამტკიცებული ბონუსების ჯამი - გატანები (დუბლიკატების იგნორი)
    const txs = await this.balanceTransactionModel
      .find({ user: userId, status: TransactionStatus.COMPLETED })
      .lean();
    const withdrawals = txs
      .filter((t: any) => (t.amount || 0) < 0)
      .reduce((sum, t: any) => sum + (t.amount || 0), 0);
    const approvedEarnings = combinedReferrals
      .filter((r) => r.status === ReferralStatus.APPROVED)
      .reduce((sum, r) => sum + (r.bonusAmount || 0), 0);
    const computedBalance = approvedEarnings + withdrawals;

    return {
      referralCode: referralCode,
      balance: computedBalance, // ტრანზაქციებიდან დათვლილი ბალანსი
      totalReferrals: combinedReferrals.length,
      approvedReferrals: combinedReferrals.filter(
        (r) => r.status === ReferralStatus.APPROVED,
      ).length,
      pendingReferrals: combinedReferrals.filter(
        (r) =>
          r.status !== ReferralStatus.APPROVED &&
          r.status !== ReferralStatus.REJECTED,
      ).length,
      totalEarnings,
      pendingEarnings,
      monthlyWithdrawals: user.monthlyWithdrawals || 0,
      referrals: combinedReferrals,
    };
  }

  // ყველა რეფერალი ადმინისთვის
  async getAllReferrals(status?: ReferralStatus): Promise<Referral[]> {
    const filter = status ? { status } : {};
    return this.referralModel
      .find(filter)
      .populate('referrer', 'name email')
      .populate('referred', 'name email role createdAt')
      .sort({ createdAt: -1 });
  }

  // მომხმარებლის ბალანსის ისტორია
  async getUserBalanceHistory(
    userId: string,
    limit = 50,
  ): Promise<ReferralBalanceTransaction[]> {
    return await this.balanceTransactionModel
      .find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('referralId');
  }

  // გასატანი მოთხოვნების სია (ადმინისთვის)
  async getWithdrawalRequests(
    status?: WithdrawalStatus,
  ): Promise<WithdrawalRequest[]> {
    const filter = status ? { status } : {};
    return await this.withdrawalRequestModel
      .find(filter)
      .populate('user', 'name email')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 });
  }

  // მომხმარებლის გასატანი მოთხოვნები
  async getUserWithdrawalRequests(
    userId: string,
  ): Promise<WithdrawalRequest[]> {
    return await this.withdrawalRequestModel
      .find({ user: userId })
      .sort({ createdAt: -1 });
  }
}
