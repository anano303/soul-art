import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SellerBalance,
  SellerBalanceDocument,
} from '../schemas/seller-balance.schema';
import {
  BalanceTransaction,
  BalanceTransactionDocument,
} from '../schemas/seller-balance.schema';

@Injectable()
export class BalanceMigrationService {
  private readonly logger = new Logger(BalanceMigrationService.name);

  constructor(
    @InjectModel(SellerBalance.name)
    private sellerBalanceModel: Model<SellerBalance>,
    @InjectModel(BalanceTransaction.name)
    private balanceTransactionModel: Model<BalanceTransaction>,
  ) {}

  /**
   * წინა withdrawal_completed ტრანზაქციების მიხედვით totalWithdrawn-ის განახლება
   */
  async updateTotalWithdrawnFromHistory(): Promise<void> {
    this.logger.log('Starting totalWithdrawn migration...');

    try {
      // ყველა სელერის ბალანსის მიღება
      const allBalances = await this.sellerBalanceModel.find();

      for (const balance of allBalances) {
        const sellerId = balance.seller.toString();

        // მოვძებნოთ ყველა withdrawal_completed ტრანზაქცია ამ სელერისთვის
        const completedWithdrawals = await this.balanceTransactionModel.find({
          seller: sellerId,
          type: 'withdrawal_completed',
        });

        // გავთვალოთ სულ რამდენი უნდა იყოს totalWithdrawn
        let totalWithdrawnFromHistory = 0;
        for (const withdrawal of completedWithdrawals) {
          // withdrawal amount-ები უარყოფითია, ამიტომ Math.abs გამოვიყენოთ
          totalWithdrawnFromHistory += Math.abs(withdrawal.amount);
        }

        // გავაახლოთ balance-ში totalWithdrawn მხოლოდ თუ სხვაობაა
        if (balance.totalWithdrawn !== totalWithdrawnFromHistory) {
          this.logger.log(
            `Updating seller ${sellerId}: current totalWithdrawn: ${balance.totalWithdrawn}, should be: ${totalWithdrawnFromHistory}`,
          );

          balance.totalWithdrawn = totalWithdrawnFromHistory;
          await balance.save();

          this.logger.log(
            `Updated seller ${sellerId} totalWithdrawn to ${totalWithdrawnFromHistory}`,
          );
        }
      }

      this.logger.log('Completed totalWithdrawn migration successfully');
    } catch (error) {
      this.logger.error('Error during totalWithdrawn migration:', error);
      throw error;
    }
  }

  /**
   * მიგრაციის შედეგების შემოწმება
   */
  async verifyMigration(): Promise<{
    sellersChecked: number;
    discrepanciesFound: number;
    details: Array<{
      sellerId: string;
      currentTotal: number;
      calculatedTotal: number;
      completedTransactions: number;
    }>;
  }> {
    this.logger.log('Verifying totalWithdrawn migration...');

    const allBalances = await this.sellerBalanceModel.find();
    const results = {
      sellersChecked: allBalances.length,
      discrepanciesFound: 0,
      details: [] as Array<{
        sellerId: string;
        currentTotal: number;
        calculatedTotal: number;
        completedTransactions: number;
      }>,
    };

    for (const balance of allBalances) {
      const sellerId = balance.seller.toString();

      const completedWithdrawals = await this.balanceTransactionModel.find({
        seller: sellerId,
        type: 'withdrawal_completed',
      });

      let calculatedTotal = 0;
      for (const withdrawal of completedWithdrawals) {
        calculatedTotal += Math.abs(withdrawal.amount);
      }

      const discrepancy = balance.totalWithdrawn !== calculatedTotal;
      if (discrepancy) {
        results.discrepanciesFound++;
      }

      results.details.push({
        sellerId,
        currentTotal: balance.totalWithdrawn,
        calculatedTotal,
        completedTransactions: completedWithdrawals.length,
      });
    }

    this.logger.log(
      `Migration verification completed: ${results.discrepanciesFound} discrepancies found`,
    );
    return results;
  }
}
