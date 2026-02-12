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
