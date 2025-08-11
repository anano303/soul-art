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
  BalanceTransaction,
  BalanceTransactionDocument,
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

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Referral.name) private referralModel: Model<ReferralDocument>,
    @InjectModel(BalanceTransaction.name)
    private balanceTransactionModel: Model<BalanceTransactionDocument>,
    @InjectModel(WithdrawalRequest.name)
    private withdrawalRequestModel: Model<WithdrawalRequestDocument>,
    @Optional()
    @Inject(forwardRef(() => 'ProductsService'))
    private readonly productsService?: any, // ტიპი ასე დავტოვოთ circular dependency-ის გამო
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
    if (!referralCode) return;

    const referrer = await this.userModel.findOne({ referralCode });
    if (!referrer) {
      this.logger.warn(`არასწორი რეფერალური კოდი: ${referralCode}`);
      return;
    }

    const referredUser = await this.userModel.findById(referredUserId);
    if (!referredUser) {
      throw new NotFoundException('მოწვეული მომხმარებელი ვერ მოიძებნა');
    }

    // შეამოწმოთ, რომ იგივე პირი არ მოიწვიოს თავის თავს
    if (referrer._id.toString() === referredUserId) {
      throw new BadRequestException('თავის თავის მოწვევა არ შეიძლება');
    }

    // განსაზღვროთ რეფერალის ტიპი და ბონუსი
    const referralType =
      referredUser.role === Role.Seller
        ? ReferralType.SELLER
        : ReferralType.USER;
    const bonusAmount = referralType === ReferralType.SELLER ? 5 : 0.2; // 5 ლარი ან 20 თეთრი

    // შევქმნათ რეფერალის ჩანაწერი
    const referral = new this.referralModel({
      referrer: referrer._id,
      referred: referredUser._id,
      type: referralType,
      bonusAmount,
      status: ReferralStatus.PENDING,
    });

    await referral.save();

    // ავფეიროთ მოწვეული მომხმარებლის ველი
    await this.userModel.findByIdAndUpdate(referredUserId, {
      referredBy: referralCode,
    });

    this.logger.log(
      `რეფერალი შექმნილია: ${referrer.email} -> ${referredUser.email} (${referralType})`,
    );
  }

  // სელერის დამტკიცება და ბონუსის გადაცემა
  async approveSellerAndPayBonus(sellerId: string): Promise<void> {
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
      throw new BadRequestException(
        'სელერს უნდა ჰქონდეს მინიმუმ 5 დამტკიცებული პროდუქტი',
      );
    }

    // ვეძებთ ამ სელერის რეფერალს
    const referral = await this.referralModel
      .findOne({
        referred: sellerId,
        type: ReferralType.SELLER,
        status: {
          $in: [ReferralStatus.PENDING, ReferralStatus.PRODUCTS_UPLOADED],
        },
      })
      .populate('referrer');

    if (referral) {
      // ვაფდეითებთ რეფერალის სტატუსს
      referral.status = ReferralStatus.APPROVED;
      referral.approvedAt = new Date();
      await referral.save();

      // ვუმატებთ ბონუსს მოწვეულს
      const referrer = referral.referrer as UserDocument;
      await this.addBalance(
        referrer._id.toString(),
        referral.bonusAmount,
        TransactionType.REFERRAL_BONUS,
        `რეფერალური ბონუსი სელერისთვის: ${seller.email}`,
        referral._id.toString(),
      );

      this.logger.log(
        `რეფერალური ბონუსი გადაცემულია: ${referrer.email} -> ${referral.bonusAmount} ლარი`,
      );
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

    const referrals = await this.referralModel
      .find({ referrer: userId })
      .populate('referred', 'name email role createdAt')
      .sort({ createdAt: -1 });

    const totalEarnings = referrals
      .filter((r) => r.status === ReferralStatus.APPROVED)
      .reduce((sum, r) => sum + r.bonusAmount, 0);

    const pendingEarnings = referrals
      .filter(
        (r) =>
          r.status === ReferralStatus.PENDING ||
          r.status === ReferralStatus.PRODUCTS_UPLOADED,
      )
      .reduce((sum, r) => sum + r.bonusAmount, 0);

    return {
      referralCode: user.referralCode,
      balance: user.referralBalance || 0, // რეფერალების ბალანსი
      totalReferrals: referrals.length,
      approvedReferrals: referrals.filter(
        (r) => r.status === ReferralStatus.APPROVED,
      ).length,
      pendingReferrals: referrals.filter(
        (r) =>
          r.status !== ReferralStatus.APPROVED &&
          r.status !== ReferralStatus.REJECTED,
      ).length,
      totalEarnings,
      pendingEarnings,
      monthlyWithdrawals: user.monthlyWithdrawals || 0,
      referrals: referrals.map((r) => ({
        id: r._id,
        referred: r.referred,
        type: r.type,
        status: r.status,
        bonusAmount: r.bonusAmount,
        createdAt: r.createdAt,
        approvedAt: r.approvedAt,
      })),
    };
  }

  // მომხმარებლის ბალანსის ისტორია
  async getUserBalanceHistory(
    userId: string,
    limit = 50,
  ): Promise<BalanceTransaction[]> {
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
