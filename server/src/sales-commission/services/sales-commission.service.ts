import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SalesCommission,
  SalesCommissionDocument,
  CommissionStatus,
} from '../schemas/sales-commission.schema';
import {
  SalesTracking,
  SalesTrackingDocument,
  TrackingEventType,
} from '../schemas/sales-tracking.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Order, OrderDocument } from '../../orders/schemas/order.schema';
import { Role } from '../../types/role.enum';
import { BogTransferService } from '../../payments/services/bog-transfer.service';
import { BankIntegrationService } from '../../users/services/bog-bank-integration.service';
import { EmailService } from '../../email/services/email.services';
import {
  BalanceTransaction,
  BalanceTransactionDocument,
} from '../../users/schemas/seller-balance.schema';

@Injectable()
export class SalesCommissionService {
  private readonly logger = new Logger(SalesCommissionService.name);
  private readonly DEFAULT_COMMISSION_PERCENT = 3; // default 3% კომისია

  constructor(
    @InjectModel(SalesCommission.name)
    private commissionModel: Model<SalesCommissionDocument>,
    @InjectModel(SalesTracking.name)
    private trackingModel: Model<SalesTrackingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(BalanceTransaction.name)
    private balanceTransactionModel: Model<BalanceTransactionDocument>,
    private bogTransferService: BogTransferService,
    private bankIntegrationService: BankIntegrationService,
    private emailService: EmailService,
  ) {}

  /**
   * Sales Manager-ისთვის უნიკალური რეფერალური კოდის გენერაცია
   * ფორმატი: SM_XXXXXXXX
   */
  async generateSalesRefCode(userId: string): Promise<string> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');
    }

    if (user.role !== Role.SalesManager && user.role !== Role.Admin) {
      throw new BadRequestException(
        'მხოლოდ Sales Manager-ს შეუძლია რეფერალური კოდის გენერაცია',
      );
    }

    // თუ უკვე აქვს კოდი, დავაბრუნოთ
    if (user.salesRefCode) {
      return user.salesRefCode;
    }

    let salesRefCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      salesRefCode = `SM_${code}`;
      attempts++;

      const existingUser = await this.userModel.findOne({ salesRefCode });
      if (!existingUser) {
        break;
      }

      if (attempts >= maxAttempts) {
        throw new BadRequestException('რეფერალური კოდის გენერაციის შეცდომა');
      }
    } while (true);

    await this.userModel.findByIdAndUpdate(userId, { salesRefCode });
    this.logger.log(
      `Generated sales ref code ${salesRefCode} for user ${userId}`,
    );
    return salesRefCode;
  }

  /**
   * შეკვეთაზე კომისიის დარიცხვა
   * გამოიძახება შეკვეთის შექმნისას
   */
  async processOrderCommission(
    orderId: string,
    salesRefCode: string,
  ): Promise<SalesCommission | null> {
    if (!salesRefCode || !salesRefCode.startsWith('SM_')) {
      return null;
    }

    this.logger.log(
      `Processing commission for order ${orderId} with ref code ${salesRefCode}`,
    );

    // მოვძებნოთ Sales Manager
    const salesManager = await this.userModel.findOne({ salesRefCode });
    if (!salesManager) {
      this.logger.warn(`Sales manager not found for ref code: ${salesRefCode}`);
      return null;
    }

    if (
      salesManager.role !== Role.SalesManager &&
      salesManager.role !== Role.Admin
    ) {
      this.logger.warn(
        `User ${salesManager.email} has ref code but is not a Sales Manager`,
      );
      return null;
    }

    // მოვძებნოთ შეკვეთა
    const order = await this.orderModel.findById(orderId).populate('user');
    if (!order) {
      this.logger.error(`Order not found: ${orderId}`);
      return null;
    }

    // შევამოწმოთ არ არსებობს თუ არა უკვე კომისია ამ შეკვეთაზე
    const existingCommission = await this.commissionModel.findOne({
      order: orderId,
    });
    if (existingCommission) {
      this.logger.warn(`Commission already exists for order: ${orderId}`);
      return existingCommission;
    }

    // გამოვთვალოთ კომისია - გამოვიყენოთ Sales Manager-ის ინდივიდუალური პროცენტი
    const commissionRate =
      salesManager.salesCommissionRate ?? this.DEFAULT_COMMISSION_PERCENT;
    const commissionAmount = (order.totalPrice * commissionRate) / 100;

    // Get user ID - order.user can be populated or just an ObjectId
    const customerId = order.user
      ? typeof order.user === 'object' && '_id' in order.user
        ? (order.user as any)._id
        : order.user
      : null;

    // შევქმნათ კომისიის ჩანაწერი
    const commission = await this.commissionModel.create({
      salesManager: salesManager._id,
      order: order._id,
      customer: customerId,
      guestEmail: order.guestInfo?.email || null,
      salesRefCode,
      orderTotal: order.totalPrice,
      commissionPercent: commissionRate,
      commissionAmount,
      status: CommissionStatus.PENDING,
    });

    this.logger.log(
      `Commission created: ${commission._id}, amount: ${commissionAmount} GEL for sales manager ${salesManager.email}`,
    );

    return commission;
  }

  /**
   * შეკვეთის მიტანისას კომისიის დამტკიცება
   */
  async approveCommission(orderId: string): Promise<SalesCommission | null> {
    const commission = await this.commissionModel.findOne({ order: orderId });
    if (!commission) {
      return null;
    }

    if (commission.status !== CommissionStatus.PENDING) {
      return commission;
    }

    commission.status = CommissionStatus.APPROVED;
    commission.approvedAt = new Date();
    await commission.save();

    // დავამატოთ თანხა Sales Manager-ის ბალანსზე
    await this.userModel.findByIdAndUpdate(commission.salesManager, {
      $inc: {
        salesCommissionBalance: commission.commissionAmount,
        totalSalesCommissions: commission.commissionAmount,
      },
    });

    this.logger.log(
      `Commission approved for order ${orderId}, amount: ${commission.commissionAmount} GEL`,
    );

    return commission;
  }

  /**
   * შეკვეთის გაუქმებისას კომისიის გაუქმება
   */
  async cancelCommission(orderId: string): Promise<SalesCommission | null> {
    const commission = await this.commissionModel.findOne({ order: orderId });
    if (!commission) {
      return null;
    }

    // თუ უკვე დამტკიცებულია, ჩამოვაჭრათ ბალანსიდან
    if (commission.status === CommissionStatus.APPROVED) {
      await this.userModel.findByIdAndUpdate(commission.salesManager, {
        $inc: {
          salesCommissionBalance: -commission.commissionAmount,
        },
      });
    }

    commission.status = CommissionStatus.CANCELLED;
    await commission.save();

    this.logger.log(`Commission cancelled for order ${orderId}`);

    return commission;
  }

  /**
   * Sales Manager-ის კომისიების მიღება
   */
  async getManagerCommissions(
    salesManagerId: string,
    page = 1,
    limit = 20,
    status?: CommissionStatus,
  ): Promise<{
    commissions: SalesCommission[];
    total: number;
    page: number;
    pages: number;
  }> {
    const query: any = { salesManager: new Types.ObjectId(salesManagerId) };
    if (status) {
      query.status = status;
    }

    const total = await this.commissionModel.countDocuments(query);
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const commissions = await this.commissionModel
      .find(query)
      .populate({
        path: 'order',
        select:
          'totalPrice status createdAt isPaid isDelivered paidAt deliveredAt shippingAddress guestInfo orderItems user deliveryType',
        populate: [
          {
            path: 'user',
            select: 'name email phoneNumber',
          },
          {
            path: 'orderItems.productId',
            select: 'name images brand user deliveryType',
            populate: {
              path: 'user',
              select: 'name storeName phoneNumber',
            },
          },
        ],
      })
      .populate('customer', 'name email phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return { commissions, total, page, pages };
  }

  /**
   * Sales Manager-ის სტატისტიკა
   */
  async getManagerStats(salesManagerId: string): Promise<{
    totalCommissions: number;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
    totalOrders: number;
  }> {
    const stats = await this.commissionModel.aggregate([
      { $match: { salesManager: new Types.ObjectId(salesManagerId) } },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$commissionAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      totalCommissions: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      paidAmount: 0,
      totalOrders: 0,
    };

    for (const stat of stats) {
      // Normalize status to uppercase for comparison (handle legacy lowercase data)
      const normalizedStatus = stat._id?.toUpperCase?.() || stat._id;

      // CANCELLED არ ჩაითვალოს totalCommissions-ში და totalOrders-ში
      if (normalizedStatus === CommissionStatus.CANCELLED) {
        continue;
      }

      result.totalOrders += stat.count;
      result.totalCommissions += stat.total;

      switch (normalizedStatus) {
        case CommissionStatus.PENDING:
          result.pendingAmount = stat.total;
          break;
        case CommissionStatus.APPROVED:
          result.approvedAmount = stat.total;
          break;
        case CommissionStatus.PAID:
          result.paidAmount = stat.total;
          break;
      }
    }

    return result;
  }

  /**
   * ყველა Sales Manager-ის სტატისტიკა (Admin-ისთვის)
   */
  async getAllManagersStats(): Promise<
    Array<{
      manager: User & {
        salesTotalWithdrawn?: number;
        salesPendingWithdrawal?: number;
        salesCommissionRate?: number;
      };
      stats: {
        totalCommissions: number;
        pendingAmount: number;
        approvedAmount: number;
        paidAmount: number;
        totalOrders: number;
      };
      isActive: boolean;
    }>
  > {
    const salesManagers = await this.userModel.find({
      role: Role.SalesManager,
    });

    const result = [];
    for (const manager of salesManagers) {
      const stats = await this.getManagerStats(manager._id.toString());

      // აქტიურია თუ აქვს მინიმუმ 1 VISIT ივენთი (ვინმე შემოვიდა მისი ბმულით)
      const visitCount = await this.trackingModel.countDocuments({
        salesManager: manager._id,
        eventType: TrackingEventType.VISIT,
      });
      const isActive = visitCount > 0;

      result.push({ manager, stats, isActive });
    }

    return result;
  }

  /**
   * რეფერალური კოდის ვალიდაცია
   */
  async validateSalesRefCode(
    code: string,
  ): Promise<{ valid: boolean; managerName?: string }> {
    if (!code || !code.startsWith('SM_')) {
      return { valid: false };
    }

    const user = await this.userModel.findOne({
      salesRefCode: code,
      role: { $in: [Role.SalesManager, Role.Admin] },
    });

    if (!user) {
      return { valid: false };
    }

    return {
      valid: true,
      managerName: user.name || 'მენეჯერი',
    };
  }

  // ========== TRACKING METHODS ==========

  /**
   * ტრეკინგ ივენტის დამატება
   */
  async trackEvent(data: {
    salesRefCode: string;
    eventType: TrackingEventType;
    visitorId?: string;
    userId?: string;
    email?: string;
    orderId?: string;
    orderAmount?: number;
    productId?: string;
    userAgent?: string;
    ipAddress?: string;
    referrerUrl?: string;
    landingPage?: string;
  }): Promise<SalesTracking | null> {
    if (!data.salesRefCode || !data.salesRefCode.startsWith('SM_')) {
      return null;
    }

    // მოვძებნოთ Sales Manager
    const salesManager = await this.userModel.findOne({
      salesRefCode: data.salesRefCode,
    });
    if (!salesManager) {
      this.logger.warn(
        `Sales manager not found for ref code: ${data.salesRefCode}`,
      );
      return null;
    }

    const tracking = await this.trackingModel.create({
      salesManager: salesManager._id,
      salesRefCode: data.salesRefCode,
      eventType: data.eventType,
      visitorId: data.visitorId,
      user: data.userId ? new Types.ObjectId(data.userId) : undefined,
      email: data.email,
      orderId: data.orderId ? new Types.ObjectId(data.orderId) : undefined,
      orderAmount: data.orderAmount,
      productId: data.productId,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      referrerUrl: data.referrerUrl,
      landingPage: data.landingPage,
    });

    this.logger.log(
      `Tracked ${data.eventType} event for ref code ${data.salesRefCode}`,
    );

    return tracking;
  }

  /**
   * Sales Manager-ის ფანელის (funnel) სტატისტიკა
   */
  async getManagerFunnelStats(
    salesManagerId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    visits: number;
    uniqueVisitors: number;
    registrations: number;
    addToCarts: number;
    checkoutStarts: number;
    purchases: number;
    conversionRate: number;
    totalRevenue: number;
    commissionRate: number;
  }> {
    // მივიღოთ Sales Manager-ის საკომისიო პროცენტი
    const manager = await this.userModel.findById(salesManagerId);
    const commissionRate =
      manager?.salesCommissionRate ?? this.DEFAULT_COMMISSION_PERCENT;

    const matchStage: any = {
      salesManager: new Types.ObjectId(salesManagerId),
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = startDate;
      if (endDate) matchStage.createdAt.$lte = endDate;
    }

    // აგრეგაცია ივენტების ტიპის მიხედვით
    const eventCounts = await this.trackingModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$orderAmount' },
        },
      },
    ]);

    // უნიკალური ვიზიტორები
    const uniqueVisitors = await this.trackingModel.aggregate([
      {
        $match: {
          ...matchStage,
          eventType: TrackingEventType.VISIT,
          visitorId: { $ne: null },
        },
      },
      { $group: { _id: '$visitorId' } },
      { $count: 'count' },
    ]);

    const result = {
      visits: 0,
      uniqueVisitors: uniqueVisitors[0]?.count || 0,
      registrations: 0,
      addToCarts: 0,
      checkoutStarts: 0,
      purchases: 0,
      conversionRate: 0,
      totalRevenue: 0,
    };

    for (const event of eventCounts) {
      switch (event._id) {
        case TrackingEventType.VISIT:
          result.visits = event.count;
          break;
        case TrackingEventType.REGISTRATION:
          result.registrations = event.count;
          break;
        case TrackingEventType.ADD_TO_CART:
          result.addToCarts = event.count;
          break;
        case TrackingEventType.CHECKOUT_START:
          result.checkoutStarts = event.count;
          break;
        case TrackingEventType.PURCHASE:
          result.purchases = event.count;
          result.totalRevenue = event.totalAmount || 0;
          break;
      }
    }

    // კონვერსიის მაჩვენებელი (ვიზიტიდან შეძენამდე)
    if (result.visits > 0) {
      result.conversionRate = Number(
        ((result.purchases / result.visits) * 100).toFixed(2),
      );
    }

    return { ...result, commissionRate };
  }

  /**
   * Sales Manager-ის დეტალური ტრეკინგ მონაცემები
   */
  async getManagerTrackingDetails(
    salesManagerId: string,
    eventType?: TrackingEventType,
    page = 1,
    limit = 50,
  ): Promise<{
    events: SalesTracking[];
    total: number;
    page: number;
    pages: number;
  }> {
    const query: any = { salesManager: new Types.ObjectId(salesManagerId) };
    if (eventType) {
      query.eventType = eventType;
    }

    const total = await this.trackingModel.countDocuments(query);
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const events = await this.trackingModel
      .find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return { events, total, page, pages };
  }

  /**
   * დღიური სტატისტიკა გრაფიკისთვის
   */
  async getManagerDailyStats(
    salesManagerId: string,
    days = 30,
  ): Promise<
    Array<{
      date: string;
      visits: number;
      registrations: number;
      purchases: number;
      revenue: number;
      commission: number;
    }>
  > {
    // მივიღოთ Sales Manager-ის ინდივიდუალური საკომისიო
    const manager = await this.userModel.findById(salesManagerId);
    const commissionRate =
      manager?.salesCommissionRate ?? this.DEFAULT_COMMISSION_PERCENT;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const stats = await this.trackingModel.aggregate([
      {
        $match: {
          salesManager: new Types.ObjectId(salesManagerId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            eventType: '$eventType',
          },
          count: { $sum: 1 },
          revenue: { $sum: '$orderAmount' },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          events: {
            $push: {
              type: '$_id.eventType',
              count: '$count',
              revenue: '$revenue',
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ფორმატირება
    return stats.map((day) => {
      const result = {
        date: day._id,
        visits: 0,
        registrations: 0,
        purchases: 0,
        revenue: 0,
        commission: 0,
      };

      for (const event of day.events) {
        switch (event.type) {
          case TrackingEventType.VISIT:
            result.visits = event.count;
            break;
          case TrackingEventType.REGISTRATION:
            result.registrations = event.count;
            break;
          case TrackingEventType.PURCHASE:
            result.purchases = event.count;
            result.revenue = event.revenue || 0;
            result.commission = (event.revenue || 0) * (commissionRate / 100);
            break;
        }
      }

      return result;
    });
  }

  /**
   * Sales Manager-ის ბალანსის მიღება (მხოლოდ დამტკიცებული კომისიებიდან)
   */
  async getManagerBalance(salesManagerId: string): Promise<{
    availableBalance: number;
    pendingWithdrawals: number;
    totalWithdrawn: number;
    totalApproved: number;
    pendingCommissions: number;
    commissionRate: number;
  }> {
    const manager = await this.userModel.findById(salesManagerId);
    if (!manager) {
      throw new NotFoundException('Sales Manager ვერ მოიძებნა');
    }

    // მხოლოდ APPROVED კომისიები - ეს არის გასატანი ბალანსი
    // Support both uppercase and lowercase status values for legacy data
    const approvedCommissions = await this.commissionModel.aggregate([
      {
        $match: {
          salesManager: new Types.ObjectId(salesManagerId),
          status: { $in: [CommissionStatus.APPROVED, 'approved'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$commissionAmount' },
        },
      },
    ]);

    // PENDING კომისიები - ჯერ არ არის დამტკიცებული (შეკვეთა ჯერ არ მიტანილა)
    const pendingCommissionsResult = await this.commissionModel.aggregate([
      {
        $match: {
          salesManager: new Types.ObjectId(salesManagerId),
          status: { $in: [CommissionStatus.PENDING, 'pending'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$commissionAmount' },
        },
      },
    ]);

    // PAID კომისიები - უკვე გატანილი
    // Support both uppercase and lowercase status values for legacy data
    const paidCommissions = await this.commissionModel.aggregate([
      {
        $match: {
          salesManager: new Types.ObjectId(salesManagerId),
          status: { $in: [CommissionStatus.PAID, 'paid'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$commissionAmount' },
        },
      },
    ]);

    const totalApproved = approvedCommissions[0]?.total || 0;
    const pendingCommissions = pendingCommissionsResult[0]?.total || 0;
    // გატანილი თანხა - User model-ის salesTotalWithdrawn ველიდან (ფაქტიური BOG გადარიცხვები)
    const totalWithdrawn = manager.salesTotalWithdrawn || 0;
    const pendingWithdrawals = manager.salesPendingWithdrawal || 0;
    const availableBalance = totalApproved - pendingWithdrawals;
    const commissionRate =
      manager.salesCommissionRate ?? this.DEFAULT_COMMISSION_PERCENT;

    return {
      availableBalance,
      pendingWithdrawals,
      totalWithdrawn,
      totalApproved,
      pendingCommissions,
      commissionRate,
    };
  }

  /**
   * Sales Manager-ის გატანების ისტორია
   */
  async getManagerWithdrawals(
    salesManagerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    withdrawals: any[];
    total: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const filter = {
      seller: new Types.ObjectId(salesManagerId),
      type: { $in: ['sm_withdrawal_pending', 'sm_withdrawal_completed'] },
    };

    const [withdrawals, total] = await Promise.all([
      this.balanceTransactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.balanceTransactionModel.countDocuments(filter),
    ]);

    return {
      withdrawals,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * თანხის გატანის მოთხოვნა
   */
  async requestWithdrawal(
    salesManagerId: string,
    amount: number,
  ): Promise<{ status: string; uniqueKey?: number; message: string }> {
    this.logger.log(
      `Processing withdrawal request for sales manager: ${salesManagerId}, amount: ${amount}`,
    );

    if (amount < 1) {
      throw new BadRequestException('მინიმალური გასატანი თანხაა 1 ლარი');
    }

    const manager = await this.userModel.findById(salesManagerId);
    if (!manager) {
      throw new NotFoundException('Sales Manager ვერ მოიძებნა');
    }

    // ბალანსის შემოწმება
    const balance = await this.getManagerBalance(salesManagerId);
    if (balance.availableBalance < amount) {
      throw new BadRequestException(
        `არასაკმარისი ბალანსი. ხელმისაწვდომია: ${balance.availableBalance.toFixed(2)} ₾`,
      );
    }

    // ანგარიშის ნომრის შემოწმება
    if (!manager.accountNumber) {
      throw new BadRequestException(
        'ბანკის ანგარიშის ნომერი არ არის მითითებული. გთხოვთ დაამატოთ ანგარიშის ნომერი პროფილის გვერდიდან.',
      );
    }

    if (!manager.identificationNumber) {
      throw new BadRequestException(
        'პირადი ნომერი არ არის მითითებული. გთხოვთ დაამატოთ პირადი ნომერი პროფილის გვერდიდან.',
      );
    }

    // ანგარიშის ფორმატირება და ვალიდაცია
    const formattedAccountNumber =
      this.bankIntegrationService.formatAccountNumber(manager.accountNumber);
    const isValid = this.bankIntegrationService.validateAccountNumber(
      formattedAccountNumber,
    );

    if (!isValid) {
      throw new BadRequestException('არასწორი ბანკის ანგარიშის ფორმატი');
    }

    try {
      // pending withdrawal-ის გაზრდა
      await this.userModel.findByIdAndUpdate(salesManagerId, {
        $inc: { salesPendingWithdrawal: amount },
      });

      // BOG-ის მეშვეობით გადარიცხვა
      const managerName = manager.name || 'Sales Manager';

      const transferResult = await this.bogTransferService.transferToSeller({
        beneficiaryAccountNumber: formattedAccountNumber,
        beneficiaryInn: manager.identificationNumber,
        beneficiaryName: managerName,
        amount: amount,
        nomination: 'SoulArt - Sales Manager კომისია',
        beneficiaryBankCode: manager.beneficiaryBankCode || 'BAGAGE22',
      });

      const isPending = transferResult.resultCode === 0;

      if (isPending) {
        // Admin-ისთვის email notification
        try {
          const adminEmail =
            process.env.ADMIN_EMAIL || 'soulartgeorgia@gmail.com';
          await this.emailService.sendWithdrawalRequestNotification({
            adminEmail,
            requesterName: managerName,
            requesterEmail: manager.email,
            requesterType: 'sales_manager',
            amount,
            accountNumber: formattedAccountNumber,
          });
        } catch (emailError) {
          this.logger.warn(
            `Admin email notification failed for withdrawal request: ${emailError.message}`,
          );
        }

        this.logger.log(
          `Withdrawal document created in BOG, pending approval. Manager: ${salesManagerId}, amount: ${amount}, BOG UniqueKey: ${transferResult.uniqueKey}`,
        );

        // Transaction ჩანაწერი pending withdrawal-ისთვის
        const pendingTransaction = new this.balanceTransactionModel({
          seller: salesManagerId, // იყენებს იგივე ველს, Sales Manager-ისთვისაც
          order: null,
          amount: -amount,
          type: 'sm_withdrawal_pending',
          description: `Sales Manager გატანის მოთხოვნა BOG-ში (${formattedAccountNumber}) - BOG UniqueKey: ${transferResult.uniqueKey}`,
          finalAmount: -amount,
        });
        await pendingTransaction.save();

        return {
          status: 'pending',
          uniqueKey: transferResult.uniqueKey,
          message:
            'გადარიცხვის დოკუმენტი შექმნილია ბანკში და ელოდება ადმინისტრატორის დამტკიცებას.',
        };
      } else {
        // გადარიცხვა დასრულდა
        await this.userModel.findByIdAndUpdate(salesManagerId, {
          $inc: {
            salesPendingWithdrawal: -amount,
            salesTotalWithdrawn: amount,
          },
        });

        // APPROVED კომისიები გადავიყვანოთ PAID სტატუსში
        await this.markCommissionsAsPaid(salesManagerId, amount);

        // Transaction ჩანაწერი დასრულებული withdrawal-ისთვის
        const completedTransaction = new this.balanceTransactionModel({
          seller: salesManagerId,
          order: null,
          amount: -amount,
          type: 'sm_withdrawal_completed',
          description: `Sales Manager თანხის გატანა დასრულდა (${formattedAccountNumber}) - BOG UniqueKey: ${transferResult.uniqueKey}`,
          finalAmount: -amount,
        });
        await completedTransaction.save();

        // Email notification Sales Manager-ს
        try {
          await this.emailService.sendWithdrawalCompletedNotification(
            manager.email,
            managerName,
            amount,
          );
        } catch (emailError) {
          this.logger.warn(
            `Email notification failed for completed withdrawal: ${emailError.message}`,
          );
        }

        this.logger.log(
          `Withdrawal completed for sales manager: ${salesManagerId}, amount: ${amount}`,
        );

        return {
          status: 'completed',
          uniqueKey: transferResult.uniqueKey,
          message: 'თანხა წარმატებით გადაირიცხა.',
        };
      }
    } catch (error) {
      // შეცდომის შემთხვევაში pending-ის დაბრუნება
      await this.userModel.findByIdAndUpdate(salesManagerId, {
        $inc: { salesPendingWithdrawal: -amount },
      });
      this.logger.error(`Withdrawal failed: ${error.message}`);
      throw new BadRequestException(
        error.message || 'თანხის გატანის მოთხოვნა ვერ გაიგზავნა',
      );
    }
  }

  /**
   * კომისიების PAID სტატუსში გადაყვანა
   */
  private async markCommissionsAsPaid(
    salesManagerId: string,
    amount: number,
  ): Promise<void> {
    let remainingAmount = amount;

    const approvedCommissions = await this.commissionModel
      .find({
        salesManager: new Types.ObjectId(salesManagerId),
        status: CommissionStatus.APPROVED,
      })
      .sort({ createdAt: 1 }); // ძველებს პირველად

    for (const commission of approvedCommissions) {
      if (remainingAmount <= 0) break;

      if (commission.commissionAmount <= remainingAmount) {
        commission.status = CommissionStatus.PAID;
        commission.paidAt = new Date();
        await commission.save();
        remainingAmount -= commission.commissionAmount;
      }
    }
  }

  /**
   * Admin-ისთვის: ყველა Sales Manager-ის pending withdrawal-ები BOG UniqueKey-ით
   */
  async getPendingWithdrawals(): Promise<
    Array<{
      _id: string;
      name: string;
      email: string;
      accountNumber: string;
      identificationNumber: string;
      beneficiaryBankCode: string;
      salesPendingWithdrawal: number;
      salesCommissionBalance: number;
      salesTotalWithdrawn: number;
      pendingTransactions: Array<{
        _id: string;
        amount: number;
        bogUniqueKey: number | null;
        createdAt: Date;
        description: string;
      }>;
    }>
  > {
    const managers = await this.userModel
      .find({
        role: Role.SalesManager,
        salesPendingWithdrawal: { $gt: 0 },
      })
      .select(
        'name email accountNumber identificationNumber beneficiaryBankCode salesPendingWithdrawal salesCommissionBalance salesTotalWithdrawn',
      );

    const result = [];

    for (const m of managers) {
      // Get pending transactions with BOG UniqueKey
      const pendingTxs = await this.balanceTransactionModel
        .find({
          seller: m._id,
          type: 'sm_withdrawal_pending',
        })
        .sort({ createdAt: -1 });

      const pendingTransactions = pendingTxs.map((tx) => {
        const uniqueKeyMatch = tx.description.match(/UniqueKey: (\d+)/);
        const txObj = tx.toObject() as any;
        return {
          _id: tx._id.toString(),
          amount: Math.abs(tx.amount),
          bogUniqueKey: uniqueKeyMatch ? parseInt(uniqueKeyMatch[1], 10) : null,
          createdAt: txObj.createdAt || new Date(),
          description: tx.description,
        };
      });

      result.push({
        _id: m._id.toString(),
        name: m.name,
        email: m.email,
        accountNumber: m.accountNumber || '',
        identificationNumber: m.identificationNumber || '',
        beneficiaryBankCode: m.beneficiaryBankCode || 'BAGAGE22',
        salesPendingWithdrawal: m.salesPendingWithdrawal || 0,
        salesCommissionBalance: m.salesCommissionBalance || 0,
        salesTotalWithdrawn: m.salesTotalWithdrawn || 0,
        pendingTransactions,
      });
    }

    return result;
  }

  /**
   * Sales Manager-ის საკომისიო პროცენტის განახლება (Admin-ისთვის)
   */
  async updateManagerCommissionRate(
    managerId: string,
    commissionRate: number,
  ): Promise<{ success: boolean; manager: any }> {
    const manager = await this.userModel.findById(managerId);
    if (!manager) {
      throw new NotFoundException('Sales Manager ვერ მოიძებნა');
    }

    if (manager.role !== Role.SalesManager && manager.role !== Role.Admin) {
      throw new BadRequestException('მომხმარებელი არ არის Sales Manager');
    }

    manager.salesCommissionRate = commissionRate;
    await manager.save();

    this.logger.log(
      `Updated commission rate for ${manager.email} to ${commissionRate}%`,
    );

    return {
      success: true,
      manager: {
        _id: manager._id,
        name: manager.name,
        email: manager.email,
        salesCommissionRate: manager.salesCommissionRate,
      },
    };
  }
}
