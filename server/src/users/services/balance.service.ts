import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SellerBalance,
  SellerBalanceDocument,
} from '../schemas/seller-balance.schema';
import {
  BalanceTransaction,
  BalanceTransactionDocument,
} from '../schemas/seller-balance.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Order, OrderDocument } from '../../orders/schemas/order.schema';
import {
  Product,
  ProductDocument,
} from '../../products/schemas/product.schema';
import { BankIntegrationService } from './bog-bank-integration.service';
import { BogTransferService } from '../../payments/services/bog-transfer.service';
import { EmailService } from '../../email/services/email.services';

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(
    @InjectModel(SellerBalance.name)
    private sellerBalanceModel: Model<SellerBalance>,
    @InjectModel(BalanceTransaction.name)
    private balanceTransactionModel: Model<BalanceTransaction>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private bankIntegrationService: BankIntegrationService,
    private bogTransferService: BogTransferService,
    private emailService: EmailService,
  ) {}

  /**
   * ყვითვენა გაყიდვიდან - ანგარიში კომისიების ჩათვლით
   */
  async processOrderEarnings(order: OrderDocument): Promise<void> {
    this.logger.log(`Processing earnings for order: ${order._id}`);

    // Check if earnings have already been processed for this order
    const existingTransactions = await this.balanceTransactionModel.findOne({
      order: order._id,
      type: 'earning',
    });

    if (existingTransactions) {
      this.logger.warn(
        `Earnings already processed for order ${order._id}. Skipping to prevent duplicate credit.`,
      );
      return;
    }

    // შეკვეთის ყველა პროდუქტისთვის ცალ-ცალკე გავანგარიშოთ
    for (const item of order.orderItems) {
      // პროდუქტის მონაცემების მიღება
      const product = await this.productModel
        .findById(item.productId)
        .populate('user');
      if (!product) {
        this.logger.warn(`Product not found for id: ${item.productId}`);
        continue;
      }

      // მივიღოთ პროდუქტის სელერი
      const seller = product.user as any;
      if (!seller || !seller._id) {
        this.logger.warn(`Seller not found for product: ${item.productId}`);
        continue;
      }

      // პროდუქტის ფასი (ფასდაკლებით თუ არსებობს)
      const itemTotalPrice = item.price * item.qty;

      // 10% საიტის საკომისიო (პროდუქტის ფასიდან)
      const siteCommission = itemTotalPrice * 0.1;

      // SoulArt მიტანის საკომისიო (თუ delivery type არის SoulArt)
      // ფორმულა: 5% მინ. 10 ლარი, მაქს. 50 ლარი
      let deliveryCommission = 0;
      if (product.deliveryType === 'SoulArt') {
        deliveryCommission = Math.min(Math.max(itemTotalPrice * 0.05, 10), 50);
      }

      // სელერის საბოლოო შემოსავალი:
      // პროდუქტის ფასი - 10% საკომისიო - SoulArt მიტანის საკომისიო (თუ არსებობს)
      // შენიშვნა: რეგიონის ფასი (shippingPrice=18₾) არ შედის პროდუქტის ფასში,
      // ის ცალკე გადახდილია და პირდაპირ SoulArt-ს რჩება
      const totalCommissions = siteCommission + deliveryCommission;
      const finalAmount = itemTotalPrice - totalCommissions;

      // შევქმნათ ან განვაახლოთ სელერის ბალანსი
      let sellerBalance = await this.sellerBalanceModel.findOne({
        seller: seller._id,
      });
      if (!sellerBalance) {
        sellerBalance = new this.sellerBalanceModel({
          seller: seller._id,
          totalBalance: finalAmount,
          totalEarnings: finalAmount,
          pendingWithdrawals: 0,
          totalWithdrawn: 0,
        });
      } else {
        sellerBalance.totalBalance += finalAmount;
        sellerBalance.totalEarnings += finalAmount;
      }

      await sellerBalance.save();

      // User model-შიც განვაახლოთ ბალანსი
      await this.userModel.findByIdAndUpdate(seller._id, {
        $inc: { balance: finalAmount },
      });

      // შევქმნათ ტრანზაქციის ჩანაწერი
      const transaction = new this.balanceTransactionModel({
        seller: seller._id,
        order: order._id,
        amount: finalAmount,
        type: 'earning',
        description: `გაყიდვიდან შემოსავალი - ${item.name}`,
        commissionPercentage: 10,
        commissionAmount: siteCommission,
        deliveryCommissionAmount: deliveryCommission,
        productPrice: itemTotalPrice,
        finalAmount: finalAmount,
      });

      await transaction.save();

      this.logger.log(
        `Processed earning for seller ${seller._id}: ${finalAmount} GEL (Product: ${item.name})`,
      );
    }
  }

  /**
   * სელერის ბალანსის მიღება
   */
  async getSellerBalance(
    sellerId: string,
  ): Promise<SellerBalanceDocument | null> {
    return this.sellerBalanceModel
      .findOne({ seller: sellerId })
      .populate('seller');
  }

  /**
   * სელერის ტრანზაქციების ისტორია
   */
  async getSellerTransactions(
    sellerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    transactions: BalanceTransactionDocument[];
    total: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.balanceTransactionModel
        .find({ seller: sellerId })
        .populate('order')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.balanceTransactionModel.countDocuments({ seller: sellerId }),
    ]);

    return {
      transactions,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Sales Manager-ის ტრანზაქციების ისტორია (გატანები)
   */
  async getSalesManagerTransactions(
    managerId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    transactions: BalanceTransactionDocument[];
    total: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // მხოლოდ Sales Manager-ის withdrawal ტრანზაქციები
    const filter = {
      seller: managerId,
      type: { $in: ['sm_withdrawal_pending', 'sm_withdrawal_completed'] },
    };

    const [transactions, total] = await Promise.all([
      this.balanceTransactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.balanceTransactionModel.countDocuments(filter),
    ]);

    return {
      transactions,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * ყველა სელერის ბალანსები (ადმინისთვის)
   */
  async getAllSellerBalances(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    balances: SellerBalanceDocument[];
    total: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [balances, total] = await Promise.all([
      this.sellerBalanceModel
        .find()
        .populate('seller')
        .sort({ totalBalance: -1 })
        .skip(skip)
        .limit(limit),
      this.sellerBalanceModel.countDocuments(),
    ]);

    return {
      balances,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Pending withdrawal requests (ადმინისთვის)
   * Fetches BOG document statuses and updates DB
   */
  async getPendingWithdrawalRequests(): Promise<{
    count: number;
    requests: any[];
  }> {
    const pendingRequests = await this.balanceTransactionModel
      .find({ type: 'withdrawal_pending' })
      .populate('seller')
      .sort({ createdAt: -1 });

    // Extract UniqueKeys from descriptions
    const uniqueKeys: number[] = [];
    const requestMap = new Map<number, BalanceTransactionDocument>();

    for (const request of pendingRequests) {
      const match = request.description.match(/UniqueKey: (\d+)/);
      if (match) {
        const uniqueKey = parseInt(match[1], 10);
        uniqueKeys.push(uniqueKey);
        requestMap.set(uniqueKey, request);
      }
    }

    // Fetch statuses from BOG API for all documents
    let statuses: any[] = [];
    if (uniqueKeys.length > 0) {
      try {
        statuses =
          await this.bogTransferService.getDocumentStatuses(uniqueKeys);
        this.logger.log(`Fetched ${statuses.length} statuses from BOG API`);
      } catch (error) {
        this.logger.error('Failed to fetch BOG statuses', error);
      }
    }

    // Update database with BOG statuses
    for (const status of statuses) {
      const request = requestMap.get(status.UniqueKey);
      if (request) {
        // Check if status changed to completed
        if (status.Status === 'P' && request.type === 'withdrawal_pending') {
          // Document is completed, update to withdrawal_completed
          this.logger.log(
            `Document ${status.UniqueKey} is completed, updating DB`,
          );

          try {
            // Update transaction type to completed
            await this.balanceTransactionModel.findByIdAndUpdate(request._id, {
              type: 'withdrawal_completed',
              description: `${request.description} - Status: Completed`,
            });

            // Update seller balance
            const sellerBalance = await this.sellerBalanceModel.findOne({
              seller: request.seller,
            });

            if (sellerBalance) {
              sellerBalance.pendingWithdrawals -= Math.abs(request.amount);
              sellerBalance.totalWithdrawn += Math.abs(request.amount);
              await sellerBalance.save();
            }

            // Send email notification
            const seller = await this.userModel.findById(request.seller);
            if (seller) {
              try {
                await this.emailService.sendWithdrawalCompletedNotification(
                  seller.email,
                  `${seller.ownerFirstName} ${seller.ownerLastName}`,
                  Math.abs(request.amount),
                );
              } catch (emailError) {
                this.logger.warn('Failed to send completion email', emailError);
              }
            }
          } catch (updateError) {
            this.logger.error(
              `Failed to update completed withdrawal ${status.UniqueKey}`,
              updateError,
            );
          }
        }
        // Check if status is rejected/cancelled
        else if (
          ['R', 'C', 'D'].includes(status.Status) &&
          request.type === 'withdrawal_pending'
        ) {
          this.logger.log(
            `Document ${status.UniqueKey} is rejected/cancelled, updating DB`,
          );

          try {
            // Return money to seller's balance
            await this.rejectWithdrawal(
              request._id.toString(),
              'system',
              `BOG Status: ${this.bogTransferService.getStatusText(status.Status)}`,
            );
          } catch (rejectError) {
            this.logger.error(
              `Failed to reject withdrawal ${status.UniqueKey}`,
              rejectError,
            );
          }
        }
      }
    }

    // Re-fetch to get updated data after status changes
    const updatedRequests = await this.balanceTransactionModel
      .find({ type: 'withdrawal_pending' })
      .populate('seller')
      .sort({ createdAt: -1 });

    // Attach BOG status to each request
    const requestsWithStatus = updatedRequests.map((request) => {
      const match = request.description.match(/UniqueKey: (\d+)/);
      let bogStatus = null;

      if (match) {
        const uniqueKey = parseInt(match[1], 10);
        const statusData = statuses.find((s) => s.UniqueKey === uniqueKey);
        if (statusData) {
          bogStatus = {
            status: statusData.Status,
            statusText: this.bogTransferService.getStatusText(
              statusData.Status,
            ),
            resultCode: statusData.ResultCode,
            rejectCode: statusData.RejectCode,
          };
        }
      }

      return {
        ...request.toObject(),
        bogStatus,
      };
    });

    return {
      count: requestsWithStatus.length,
      requests: requestsWithStatus,
    };
  }

  /**
   * თანხის გატანის მოთხოვნა (დროებითი implementation)
   */
  async requestWithdrawal(
    sellerId: string,
    amount: number,
  ): Promise<{ status: string; uniqueKey: number; message: string }> {
    this.logger.log(
      `Processing withdrawal request for seller: ${sellerId}, amount: ${amount}`,
    );

    // მინიმუმ თანხის შემოწმება (0.1 ლარი ტესტისთვის)
    if (amount < 1) {
      throw new Error('მინიმალური გასატანი თანხაა 1 ლარი');
    }

    // სელერის ბალანსის შემოწმება
    const sellerBalance = await this.sellerBalanceModel.findOne({
      seller: sellerId,
    });

    if (!sellerBalance) {
      throw new Error('სელერის ბალანსი არ მოიძებნა');
    }

    if (sellerBalance.totalBalance < amount) {
      throw new Error('არასაკმარისი ბალანსი');
    }

    // სელერის ანგარიშის ნომრის მიღება
    const seller = await this.userModel.findById(sellerId);

    if (!seller || !seller.accountNumber) {
      throw new Error(
        'ბანკის ანგარიშის ნომერი არ არის მითითებული. გთხოვთ დაამატოთ ანგარიშის ნომერი პროფილის გვერდიდან.',
      );
    }

    // ID number validation for BOG transfer
    if (!seller.identificationNumber) {
      throw new Error(
        'პირადი ნომერი არ არის მითითებული. გთხოვთ დაამატოთ პირადი ნომერი პროფილის გვერდიდან.',
      );
    }

    // ანგარიშის ნომრის ვალიდაცია
    const formattedAccountNumber =
      this.bankIntegrationService.formatAccountNumber(seller.accountNumber);

    const isValid = this.bankIntegrationService.validateAccountNumber(
      formattedAccountNumber,
    );

    if (!isValid) {
      throw new Error('არასწორი ბანკის ანგარიშის ფორმატი');
    }

    try {
      // ბალანსიდან თანხის დროებით გამოკლება
      sellerBalance.totalBalance -= amount;
      sellerBalance.pendingWithdrawals += amount;
      await sellerBalance.save();

      // User model-შიც განვაახლოთ
      await this.userModel.findByIdAndUpdate(sellerId, {
        $inc: { balance: -amount },
      });

      // BOG-ის მეშვეობით ავტომატური გადარიცხვა
      try {
        const sellerName =
          `${seller.ownerFirstName || ''} ${seller.ownerLastName || ''}`.trim();

        const transferResult = await this.bogTransferService.transferToSeller({
          beneficiaryAccountNumber: formattedAccountNumber,
          beneficiaryInn: seller.identificationNumber,
          beneficiaryName: sellerName,
          amount: amount,
          nomination: 'SoulArt - გაყიდვებიდან მიღებული თანხა',
          beneficiaryBankCode: seller.beneficiaryBankCode || 'BAGAGE22',
        });

        // გადარიცხვა შეიქმნა BOG-ში და ელოდება ხელმოწერას
        // ResultCode 0 = Ready to Sign, ResultCode 1 = Completed
        const isPending = transferResult.resultCode === 0;

        if (isPending) {
          // დოკუმენტი შეიქმნა და ელოდება დამტკიცებას
          const transaction = new this.balanceTransactionModel({
            seller: sellerId,
            order: null,
            amount: -amount,
            type: 'withdrawal_pending',
            description: `თანხის გატანის მოთხოვნა BOG-ში შექმნილია და ელოდება დამტკიცებას (${formattedAccountNumber}) - BOG UniqueKey: ${transferResult.uniqueKey}`,
            finalAmount: -amount,
          });

          await transaction.save();

          // Admin-ისთვის email notification
          try {
            const adminEmail =
              process.env.ADMIN_EMAIL || 'soulartgeorgia@gmail.com';
            const sellerName =
              `${seller.ownerFirstName || ''} ${seller.ownerLastName || ''}`.trim() ||
              seller.name;
            await this.emailService.sendWithdrawalRequestNotification({
              adminEmail,
              requesterName: sellerName,
              requesterEmail: seller.email,
              requesterType: 'seller',
              amount,
              accountNumber: formattedAccountNumber,
            });
          } catch (emailError) {
            this.logger.warn(
              `Admin email notification failed for withdrawal request: ${emailError.message}`,
            );
          }

          this.logger.log(
            `Withdrawal document created in BOG, pending approval. Seller: ${sellerId}, amount: ${amount}, BOG UniqueKey: ${transferResult.uniqueKey}`,
          );

          return {
            status: 'pending',
            uniqueKey: transferResult.uniqueKey,
            message:
              'გადარიცხვის დოკუმენტი შექმნილია ბანკში და ელოდება ადმინისტრატორის დამტკიცებას.',
          };
        } else {
          // გადარიცხვა დასრულდა (ResultCode === 1)
          sellerBalance.pendingWithdrawals -= amount;
          sellerBalance.totalWithdrawn += amount;
          await sellerBalance.save();

          const transaction = new this.balanceTransactionModel({
            seller: sellerId,
            order: null,
            amount: -amount,
            type: 'withdrawal_completed',
            description: `თანხის წარმატებული გადარიცხვა (${formattedAccountNumber}) - BOG UniqueKey: ${transferResult.uniqueKey}`,
            finalAmount: -amount,
          });

          await transaction.save();

          // Email notification სელერისთვის
          try {
            await this.emailService.sendWithdrawalCompletedNotification(
              seller.email,
              sellerName,
              amount,
            );
          } catch (emailError) {
            this.logger.warn(
              `Email notification failed for successful withdrawal: ${emailError.message}`,
            );
          }

          this.logger.log(
            `Automatic withdrawal completed for seller: ${sellerId}, amount: ${amount}, BOG UniqueKey: ${transferResult.uniqueKey}`,
          );

          return {
            status: 'completed',
            uniqueKey: transferResult.uniqueKey,
            message: 'თანხა წარმატებით გადაირიცხა თქვენს ანგარიშზე.',
          };
        }
      } catch (bogError) {
        // BOG გადარიცხვის ერორის შემთხვევაში ბალანსის აღდგენა
        sellerBalance.totalBalance += amount;
        sellerBalance.pendingWithdrawals -= amount;
        await sellerBalance.save();

        // User model-შიც ბალანსის აღდგენა
        await this.userModel.findByIdAndUpdate(sellerId, {
          $inc: { balance: amount },
        });

        // წარუმატებელი გადარიცხვის ტრანზაქციის ჩანაწერი
        const failedTransaction = new this.balanceTransactionModel({
          seller: sellerId,
          order: null,
          amount: 0,
          type: 'withdrawal_failed',
          description: `თანხის გადარიცხვა ვერ მოხერხდა: ${bogError.message}`,
          finalAmount: 0,
        });

        await failedTransaction.save();

        this.logger.error(
          `BOG transfer failed for seller: ${sellerId}, error: ${bogError.message}`,
          bogError.stack,
        );

        throw new Error(
          `გადარიცხვა ვერ მოხერხდა. გთხოვთ შეამოწმოთ ანგარიშის მონაცემები და სცადოთ ხელახლა. შეცდომა: ${bogError.message}`,
        );
      }
    } catch (error) {
      // ზოგადი ერორის შემთხვევაში ბალანსის აღდგენა (თუ აქამდე მოვიდა)
      if (sellerBalance.pendingWithdrawals >= amount) {
        sellerBalance.totalBalance += amount;
        sellerBalance.pendingWithdrawals -= amount;
        await sellerBalance.save();

        // User model-შიც ბალანსის აღდგენა
        await this.userModel.findByIdAndUpdate(sellerId, {
          $inc: { balance: amount },
        });
      }

      this.logger.error(
        `Withdrawal request failed for seller: ${sellerId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * პროდუქტის დეტალები (order controller-ისთვის)
   */
  async getProductDetails(productId: string) {
    return this.productModel.findById(productId).populate('user');
  }

  /**
   * Withdrawal-ის დადასტურება (ადმინისთვის)
   */
  async approveWithdrawal(
    transactionId: string,
    adminId: string,
  ): Promise<void> {
    this.logger.log(
      `Approving withdrawal transaction: ${transactionId} by admin: ${adminId}`,
    );

    const transaction = await this.balanceTransactionModel
      .findById(transactionId)
      .populate('seller');

    if (!transaction) {
      throw new Error('ტრანზაქცია არ მოიძებნა');
    }

    // Check if already completed (prevent double processing)
    if (transaction.type === 'withdrawal_completed') {
      this.logger.warn(
        `Withdrawal ${transactionId} is already completed, skipping duplicate approval`,
      );
      return;
    }

    if (transaction.type !== 'withdrawal_pending') {
      throw new Error('ტრანზაქცია არ არის დასამუშავებელი');
    }

    const sellerId = (transaction.seller as any)._id.toString();
    const amount = Math.abs(transaction.amount);

    // ბალანსის განახლება
    const sellerBalance = await this.sellerBalanceModel.findOne({
      seller: sellerId,
    });

    if (!sellerBalance) {
      throw new Error('სელერის ბალანსი არ მოიძებნა');
    }

    // Pending-იდან წაშლა და totalWithdrawn-ის განახლება
    sellerBalance.pendingWithdrawals = Math.max(
      0,
      sellerBalance.pendingWithdrawals - amount,
    );
    sellerBalance.totalWithdrawn += amount;
    await sellerBalance.save();

    // ტრანზაქციის განახლება (არ ვქმნით ახალ ტრანზაქციას, მხოლოდ ვაახლებთ არსებულს)
    transaction.type = 'withdrawal_completed';
    transaction.description = `თანხის გატანა წარმატებით დასრულდა (${amount} ლარი) - ${transaction.description}`;
    await transaction.save();

    // Email notification სელერისთვის
    try {
      const seller = transaction.seller as any;
      await this.emailService.sendWithdrawalCompletedNotification(
        seller.email,
        (seller.ownerFirstName || '') + ' ' + (seller.ownerLastName || ''),
        amount,
      );
    } catch (emailError) {
      this.logger.warn(
        `Email notification failed for withdrawal approval: ${emailError.message}`,
      );
    }

    this.logger.log(`Withdrawal approved successfully: ${transactionId}`);
  }

  /**
   * Withdrawal-ის უარყოფა (ადმინისთვის)
   */
  async rejectWithdrawal(
    transactionId: string,
    adminId: string,
    reason?: string,
  ): Promise<void> {
    this.logger.log(
      `Rejecting withdrawal transaction: ${transactionId} by admin: ${adminId}`,
    );

    const transaction = await this.balanceTransactionModel
      .findById(transactionId)
      .populate('seller');

    if (!transaction || transaction.type !== 'withdrawal_pending') {
      throw new Error('ტრანზაქცია არ მოიძებნა ან არ არის დასამუშავებელი');
    }

    const sellerId = (transaction.seller as any)._id.toString();
    const amount = Math.abs(transaction.amount);

    // Extract UniqueKey from description to cancel in BOG
    const uniqueKeyMatch = transaction.description.match(/UniqueKey: (\d+)/);
    if (uniqueKeyMatch) {
      const uniqueKey = parseInt(uniqueKeyMatch[1], 10);
      try {
        this.logger.log(`Attempting to cancel BOG document: ${uniqueKey}`);
        await this.bogTransferService.cancelDocument(uniqueKey);
        this.logger.log(`BOG document ${uniqueKey} cancelled successfully`);
      } catch (cancelError) {
        this.logger.warn(
          `Failed to cancel BOG document ${uniqueKey}: ${cancelError.message}. Continuing with local rejection.`,
        );
        // Continue with local rejection even if BOG cancellation fails
      }
    }

    // ბალანსის აღდგენა
    const sellerBalance = await this.sellerBalanceModel.findOne({
      seller: sellerId,
    });

    if (!sellerBalance) {
      throw new Error('სელერის ბალანსი არ მოიძებნა');
    }

    // ბალანსის აღდგენა
    sellerBalance.totalBalance += amount;
    sellerBalance.pendingWithdrawals = Math.max(
      0,
      sellerBalance.pendingWithdrawals - amount,
    );
    await sellerBalance.save();

    // User model-შიც ბალანსის აღდგენა
    await this.userModel.findByIdAndUpdate(sellerId, {
      $inc: { balance: amount },
    });

    // ტრანზაქციის განახლება
    transaction.type = 'withdrawal_rejected';
    transaction.description = `თანხის გატანა უარყოფილია ადმინის მიერ${reason ? `: ${reason}` : ''}`;
    await transaction.save();

    // Email notification სელერისთვის
    try {
      const seller = transaction.seller as any;
      await this.emailService.sendWithdrawalRejectedNotification(
        seller.email,
        (seller.ownerFirstName || '') + ' ' + (seller.ownerLastName || ''),
        amount,
        reason || 'მიზეზი არ არის მითითებული',
      );
    } catch (emailError) {
      this.logger.warn(
        `Email notification failed for withdrawal rejection: ${emailError.message}`,
      );
    }

    this.logger.log(`Withdrawal rejected successfully: ${transactionId}`);
  }

  /**
   * აუქციონიდან შემოსავლის დამატება
   */
  async addAuctionEarnings(
    sellerId: string,
    amount: number,
    auctionId: string,
    auctionTitle: string,
  ): Promise<void> {
    this.logger.log(
      `Adding auction earnings for seller: ${sellerId}, amount: ${amount} GEL`,
    );

    // შევქმნათ ან განვაახლოთ სელერის ბალანსი
    let sellerBalance = await this.sellerBalanceModel.findOne({
      seller: sellerId,
    });

    if (!sellerBalance) {
      sellerBalance = new this.sellerBalanceModel({
        seller: sellerId,
        totalBalance: amount,
        totalEarnings: amount,
        pendingWithdrawals: 0,
        totalWithdrawn: 0,
      });
    } else {
      sellerBalance.totalBalance += amount;
      sellerBalance.totalEarnings += amount;
    }

    await sellerBalance.save();

    // User model-შიც განვაახლოთ ბალანსი
    await this.userModel.findByIdAndUpdate(sellerId, {
      $inc: { balance: amount },
    });

    // შევქმნათ ტრანზაქციის ჩანაწერი
    const transaction = new this.balanceTransactionModel({
      seller: sellerId,
      order: null, // აუქციონისთვის order არ არის
      amount: amount,
      type: 'auction_earning',
      description: `აუქციონიდან შემოსავალი - ${auctionTitle}`,
      commissionPercentage: 10,
      commissionAmount: (amount / 0.9) * 0.1, // Original auction price * 10%
      finalAmount: amount,
      auctionId: auctionId, // ცალკე ფილდი აუქციონის ID-სთვის
    });

    await transaction.save();

    this.logger.log(
      `Auction earnings processed for seller ${sellerId}: ${amount} GEL (Auction: ${auctionTitle})`,
    );
  }
}
