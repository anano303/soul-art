import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from './schemas/settings.schema';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name)
    private settingsModel: Model<SettingsDocument>,
  ) {}

  // Default USD rate (1 USD = 2.5 GEL)
  private readonly DEFAULT_USD_RATE = 2.5;
  // Default foreign payment fee (20%)
  private readonly DEFAULT_FOREIGN_FEE = 20;
  // Default foreign shipping fee (10 GEL)
  private readonly DEFAULT_FOREIGN_SHIPPING = 10;

  async getUsdRate(): Promise<number> {
    const setting = await this.settingsModel.findOne({ key: 'usd_rate' });
    return setting?.value || this.DEFAULT_USD_RATE;
  }

  async setUsdRate(rate: number): Promise<number> {
    await this.settingsModel.findOneAndUpdate(
      { key: 'usd_rate' },
      { 
        key: 'usd_rate',
        value: rate,
        description: 'USD to GEL exchange rate (1 USD = X GEL)'
      },
      { upsert: true, new: true },
    );
    return rate;
  }

  async getForeignPaymentFee(): Promise<number> {
    const setting = await this.settingsModel.findOne({ key: 'foreign_payment_fee' });
    return setting?.value ?? this.DEFAULT_FOREIGN_FEE;
  }

  async setForeignPaymentFee(feePercent: number): Promise<number> {
    await this.settingsModel.findOneAndUpdate(
      { key: 'foreign_payment_fee' },
      { 
        key: 'foreign_payment_fee',
        value: feePercent,
        description: 'Additional fee percentage for foreign currency payments (e.g., 20 = +20%)'
      },
      { upsert: true, new: true },
    );
    return feePercent;
  }

  async getForeignShippingFee(): Promise<number> {
    const setting = await this.settingsModel.findOne({ key: 'foreign_shipping_fee' });
    return setting?.value ?? this.DEFAULT_FOREIGN_SHIPPING;
  }

  async setForeignShippingFee(feeGel: number): Promise<number> {
    await this.settingsModel.findOneAndUpdate(
      { key: 'foreign_shipping_fee' },
      { 
        key: 'foreign_shipping_fee',
        value: feeGel,
        description: 'Additional fixed shipping fee for foreign countries (in GEL)'
      },
      { upsert: true, new: true },
    );
    return feeGel;
  }

  async getSetting(key: string): Promise<any> {
    const setting = await this.settingsModel.findOne({ key });
    return setting?.value || null;
  }

  async setSetting(key: string, value: any, description?: string): Promise<any> {
    await this.settingsModel.findOneAndUpdate(
      { key },
      { key, value, description },
      { upsert: true, new: true },
    );
    return value;
  }

  async getAllSettings(): Promise<Settings[]> {
    return this.settingsModel.find().exec();
  }
}
