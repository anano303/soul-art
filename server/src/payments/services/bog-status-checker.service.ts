import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BogTransferService } from './bog-transfer.service';
import { BalanceTransaction } from '../../users/schemas/seller-balance.schema';
import { SellerBalance } from '../../users/schemas/seller-balance.schema';
import { EmailService } from '../../email/services/email.services';
import { User } from '../../users/schemas/user.schema';

@Injectable()
export class BogStatusCheckerService {
  private readonly logger = new Logger(BogStatusCheckerService.name);

  constructor(
    private readonly bogTransferService: BogTransferService,
    @InjectModel(BalanceTransaction.name)
    private balanceTransactionModel: Model<BalanceTransaction>,
    @InjectModel(SellerBalance.name)
    private sellerBalanceModel: Model<SellerBalance>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    private emailService: EmailService,
  ) {}

  /**
   * Check pending BOG transfers every 30 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkPendingTransfers() {
    this.logger.log('Starting check for pending BOG transfers...');

    try {
      // Find all pending withdrawal transactions
      const pendingTransactions = await this.balanceTransactionModel
        .find({
          type: 'withdrawal_pending',
        })
        .populate('seller');

      this.logger.log(`Found ${pendingTransactions.length} pending withdrawals`);

      for (const transaction of pendingTransactions) {
        try {
          // Extract BOG UniqueKey from description
          const uniqueKeyMatch = transaction.description.match(/UniqueKey: (\d+)/);
          if (!uniqueKeyMatch) {
            this.logger.warn(
              `No UniqueKey found in transaction ${transaction._id}`,
            );
            continue;
          }

          const uniqueKey = parseInt(uniqueKeyMatch[1], 10);

          // Check document status
          const docStatus = await this.bogTransferService.getDocumentStatus(uniqueKey);

          // ResultCode 1 = Completed
          if (docStatus.ResultCode === 1) {
            await this.markTransferAsCompleted(transaction, uniqueKey);
          }
          // ResultCode < 0 = Failed/Rejected
          else if (docStatus.ResultCode < 0) {
            await this.markTransferAsFailed(transaction, uniqueKey, docStatus.ResultCode);
          }
          // ResultCode 0 = Still pending signature
          else {
            this.logger.debug(
              `Transfer ${uniqueKey} still pending signature`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error checking transaction ${transaction._id}: ${error.message}`,
          );
        }
      }

      this.logger.log('Finished checking pending BOG transfers');
    } catch (error) {
      this.logger.error('Error in checkPendingTransfers:', error);
    }
  }

  /**
   * Mark transfer as completed
   */
  private async markTransferAsCompleted(
    transaction: any,
    uniqueKey: number,
  ) {
    this.logger.log(`Transfer ${uniqueKey} completed, updating status...`);

    const seller = transaction.seller as any;
    const amount = Math.abs(transaction.amount);

    // Update seller balance
    const sellerBalance = await this.sellerBalanceModel.findOne({
      seller: seller._id,
    });

    if (sellerBalance) {
      sellerBalance.pendingWithdrawals -= amount;
      sellerBalance.totalWithdrawn += amount;
      await sellerBalance.save();
    }

    // Update transaction type
    transaction.type = 'withdrawal_completed';
    transaction.description = transaction.description.replace(
      'ელოდება დამტკიცებას',
      'წარმატებით შესრულდა',
    );
    await transaction.save();

    // Send email notification
    try {
      const sellerName = `${seller.ownerFirstName || ''} ${seller.ownerLastName || ''}`.trim();
      await this.emailService.sendWithdrawalCompletedNotification(
        seller.email,
        sellerName,
        amount,
      );
    } catch (emailError) {
      this.logger.warn(`Failed to send email for ${seller.email}`);
    }

    this.logger.log(`Transfer ${uniqueKey} marked as completed`);
  }

  /**
   * Mark transfer as failed and restore balance
   */
  private async markTransferAsFailed(
    transaction: any,
    uniqueKey: number,
    resultCode: number,
  ) {
    this.logger.log(
      `Transfer ${uniqueKey} failed (code: ${resultCode}), restoring balance...`,
    );

    const seller = transaction.seller as any;
    const amount = Math.abs(transaction.amount);

    // Restore seller balance
    const sellerBalance = await this.sellerBalanceModel.findOne({
      seller: seller._id,
    });

    if (sellerBalance) {
      sellerBalance.totalBalance += amount;
      sellerBalance.pendingWithdrawals -= amount;
      await sellerBalance.save();
    }

    // Update user balance
    await this.userModel.findByIdAndUpdate(seller._id, {
      $inc: { balance: amount },
    });

    // Update transaction type
    transaction.type = 'withdrawal_failed';
    transaction.description = `გადარიცხვა უარყოფილია ბანკის მიერ (კოდი: ${resultCode}) - ბალანსი აღდგენილია - BOG UniqueKey: ${uniqueKey}`;
    await transaction.save();

    this.logger.log(`Transfer ${uniqueKey} marked as failed, balance restored`);
  }

  /**
   * Manual check for specific transaction
   */
  async checkTransactionStatus(transactionId: string) {
    const transaction = await this.balanceTransactionModel
      .findById(transactionId)
      .populate('seller');

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const uniqueKeyMatch = transaction.description.match(/UniqueKey: (\d+)/);
    if (!uniqueKeyMatch) {
      throw new Error('No UniqueKey found in transaction');
    }

    const uniqueKey = parseInt(uniqueKeyMatch[1], 10);
    const docStatus = await this.bogTransferService.getDocumentStatus(uniqueKey);

    return {
      transactionId: transaction._id,
      uniqueKey,
      status: docStatus.ResultCode === 1 ? 'completed' : docStatus.ResultCode === 0 ? 'pending' : 'failed',
      resultCode: docStatus.ResultCode,
      details: docStatus,
    };
  }
}
