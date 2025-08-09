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
    private bankIntegrationService: BankIntegrationService,
    private emailService: EmailService,
  ) {}

  /**
   * ყვითვენა გაყიდვიდან - ანგარიში კომისიების ჩათვლით
   */
  async processOrderEarnings(order: OrderDocument): Promise<void> {
    this.logger.log(`Processing earnings for order: ${order._id}`);

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

      // გავანგარიშოთ კომისიები
      const itemTotalPrice = item.price * item.qty;
      const siteCommission = itemTotalPrice * 0.1; // 10% საიტის კომისია

      // მიტანის კომისია (თუ delivery type არის SoulArt)
      let deliveryCommission = 0;
      if (product.deliveryType === 'SoulArt') {
        deliveryCommission = Math.max(itemTotalPrice * 0.05, 10); // 5% მინ. 10 ლარი
      }

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
   * თანხის გატანის მოთხოვნა და ავტომატური გადარიცხვა
   */
  async requestWithdrawal(sellerId: string, amount: number): Promise<void> {
    this.logger.log(
      `Processing withdrawal request for seller: ${sellerId}, amount: ${amount}`,
    );

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
      throw new Error('სელერის ბანკის ანგარიშის ნომერი არ არის მითითებული');
    }

    // ანგარიშის ნომრის ვალიდაცია
    const formattedAccountNumber =
      this.bankIntegrationService.formatAccountNumber(seller.accountNumber);
    if (
      !this.bankIntegrationService.validateAccountNumber(formattedAccountNumber)
    ) {
      throw new Error('არასწორი ბანკის ანგარიშის ფორმატი');
    }

    try {
      // ბალანსიდან თანხის დროებით გამოკლება
      sellerBalance.totalBalance -= amount;
      sellerBalance.pendingWithdrawals += amount;
      await sellerBalance.save();

      // ბანკის API-სთან კომუნიკაცია
      const bankTransferResult =
        await this.bankIntegrationService.transferToSeller({
          recipientAccountNumber: formattedAccountNumber,
          amount: amount,
          currency: 'GEL',
          description: `SoulArt გაყიდვებიდან შემოსავალი - ${seller.storeName || seller.name}`,
          sellerId: sellerId,
        });

      if (bankTransferResult.success) {
        // წარმატებული გადარიცხვის შემდეგ
        sellerBalance.pendingWithdrawals -= amount;
        sellerBalance.totalWithdrawn += amount;
        await sellerBalance.save();

        // User model-შიც განვაახლოთ
        await this.userModel.findByIdAndUpdate(sellerId, {
          $inc: { balance: -amount },
        });

        // წარმატებული ტრანზაქციის ჩანაწერი
        const transaction = new this.balanceTransactionModel({
          seller: sellerId,
          order: null,
          amount: -amount,
          type: 'withdrawal',
          description: `თანხის გადარიცხვა ანგარიშზე ${formattedAccountNumber} (${bankTransferResult.transactionId})`,
          finalAmount: -amount,
        });

        await transaction.save();

        // Email notifications
        try {
          // სელერისთვის notification
          await this.emailService.sendWithdrawalNotification(
            seller.email,
            (seller.ownerFirstName || '') + ' ' + (seller.ownerLastName || ''),
            amount,
            bankTransferResult.transactionId,
            formattedAccountNumber,
          );

          // ადმინისთვის notification
          await this.emailService.sendWithdrawalAdminNotification(
            (seller.ownerFirstName || '') + ' ' + (seller.ownerLastName || ''),
            amount,
            seller.email,
            bankTransferResult.transactionId,
          );
        } catch (emailError) {
          this.logger.warn(
            `Email notification failed for withdrawal ${bankTransferResult.transactionId}: ${emailError.message}`,
          );
        }

        this.logger.log(
          `Withdrawal successful for seller: ${sellerId}, transaction: ${bankTransferResult.transactionId}`,
        );
      } else {
        // წარუმატებლობის შემდეგ ბალანსის აღდგენა
        sellerBalance.totalBalance += amount;
        sellerBalance.pendingWithdrawals -= amount;
        await sellerBalance.save();

        // წარუმატებლობის ტრანზაქცია
        const failedTransaction = new this.balanceTransactionModel({
          seller: sellerId,
          order: null,
          amount: 0,
          type: 'withdrawal_failed',
          description: `თანხის გატანა ვერ მოხერხდა: ${bankTransferResult.message}`,
          finalAmount: 0,
        });

        await failedTransaction.save();

        throw new Error(
          `თანხის გადარიცხვა ვერ მოხერხდა: ${bankTransferResult.message}`,
        );
      }
    } catch (error) {
      // ერორის შემთხვევაში ბალანსის აღდგენა
      if (sellerBalance.pendingWithdrawals >= amount) {
        sellerBalance.totalBalance += amount;
        sellerBalance.pendingWithdrawals -= amount;
        await sellerBalance.save();
      }

      this.logger.error(
        `Withdrawal failed for seller: ${sellerId}`,
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
}
