import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExchangeRate, ExchangeRateDocument } from './schemas/exchange-rate.schema';

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(
    @InjectModel(ExchangeRate.name)
    private exchangeRateModel: Model<ExchangeRateDocument>,
  ) {}

  /**
   * Fetch exchange rates from National Bank of Georgia (NBG) API
   * NBG provides rates in format: how many foreign currency = 1 GEL
   * We need the inverse: how many GEL = 1 foreign currency
   */
  async fetchFromNBG(): Promise<void> {
    try {
      this.logger.log('Fetching exchange rates from NBG API...');
      
      // NBG API endpoint
      const response = await fetch('https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json');
      
      if (!response.ok) {
        throw new Error(`NBG API returned status ${response.status}`);
      }

      const data = await response.json();
      
      // NBG returns array of currencies with rates
      // Format: [{ code: 'USD', rate: 2.7, quantity: 1, ... }, ...]
      // Rate means: 1 GEL = (quantity / rate) USD
      
      const usdData = data[0]?.currencies?.find((c: any) => c.code === 'USD');
      const eurData = data[0]?.currencies?.find((c: any) => c.code === 'EUR');
      
      if (!usdData || !eurData) {
        throw new Error('USD or EUR not found in NBG response');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to midnight for consistency

      // Calculate rates: how many foreign currency = 1 GEL
      const usdRate = usdData.quantity / usdData.rate;
      const eurRate = eurData.quantity / eurData.rate;

      // Update or create USD rate
      await this.exchangeRateModel.findOneAndUpdate(
        { currency: 'USD', date: today },
        {
          currency: 'USD',
          rate: usdRate,
          date: today,
          source: 'NBG',
        },
        { upsert: true, new: true },
      );

      // Update or create EUR rate
      await this.exchangeRateModel.findOneAndUpdate(
        { currency: 'EUR', date: today },
        {
          currency: 'EUR',
          rate: eurRate,
          date: today,
          source: 'NBG',
        },
        { upsert: true, new: true },
      );

      this.logger.log(`Successfully updated exchange rates: 1 GEL = ${usdRate.toFixed(4)} USD, ${eurRate.toFixed(4)} EUR`);
    } catch (error) {
      this.logger.error('Failed to fetch exchange rates from NBG:', error.message);
      throw error;
    }
  }

  /**
   * Cron job to fetch exchange rates every day at midnight (Georgian time)
   * Runs at 00:00 every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/Tbilisi',
  })
  async handleDailyRateUpdate() {
    this.logger.log('Running daily exchange rate update (midnight cron)');
    try {
      await this.fetchFromNBG();
    } catch (error) {
      this.logger.error('Daily exchange rate update failed:', error.message);
    }
  }

  /**
   * Get latest exchange rate for a currency
   */
  async getLatestRate(currency: 'USD' | 'EUR'): Promise<number> {
    const rate = await this.exchangeRateModel
      .findOne({ currency })
      .sort({ date: -1 }) // Get most recent
      .exec();

    if (!rate) {
      this.logger.warn(`No exchange rate found for ${currency}, fetching from NBG...`);
      await this.fetchFromNBG();
      return this.getLatestRate(currency); // Retry after fetching
    }

    return rate.rate;
  }

  /**
   * Get all latest exchange rates
   */
  async getLatestRates(): Promise<{ USD: number; EUR: number }> {
    const [usd, eur] = await Promise.all([
      this.getLatestRate('USD'),
      this.getLatestRate('EUR'),
    ]);

    return { USD: usd, EUR: eur };
  }

  /**
   * Convert GEL price to foreign currency
   * @param gelPrice Price in GEL
   * @param currency Target currency
   * @param foreignFeePercent Additional fee for foreign payments (e.g., 20 means +20%)
   * @returns Converted and rounded price
   */
  async convertPrice(
    gelPrice: number,
    currency: 'USD' | 'EUR',
    foreignFeePercent: number = 0,
  ): Promise<number> {
    const rate = await this.getLatestRate(currency);
    
    // Add foreign fee
    const priceWithFee = gelPrice * (1 + foreignFeePercent / 100);
    
    // Convert to foreign currency
    const convertedPrice = priceWithFee * rate;
    
    // Ceil for better presentation
    return Math.ceil(convertedPrice);
  }

  /**
   * Get breakdown of price conversion (for transparency)
   */
  async getPriceBreakdown(
    gelPrice: number,
    currency: 'USD' | 'EUR',
    foreignFeePercent: number = 0,
  ) {
    const rate = await this.getLatestRate(currency);
    const feeAmount = gelPrice * (foreignFeePercent / 100);
    const priceWithFee = gelPrice + feeAmount;
    const convertedPrice = priceWithFee * rate;
    const finalPrice = Math.ceil(convertedPrice);

    return {
      basePrice: gelPrice, // Original GEL price
      fee: feeAmount, // Fee in GEL
      feePercent: foreignFeePercent,
      totalGEL: priceWithFee,
      exchangeRate: rate,
      convertedPrice, // Exact converted price
      finalPrice, // Ceiled final price
      currency,
    };
  }
}
