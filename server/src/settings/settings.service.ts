import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from './schemas/settings.schema';

export interface SellerNotificationSuggestion {
  slug: string;
  label: string;
}

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
  private readonly SELLER_NOTIFICATION_SUGGESTIONS_KEY =
    'seller_notification_suggestions';
  private readonly DEFAULT_SELLER_NOTIFICATION_SUGGESTIONS: SellerNotificationSuggestion[] =
    [
      { slug: 'httpswwwinstagramcomartekoek', label: 'ARTEKO' },
      { slug: 'natia-chijavadze', label: 'Natia Chijavadze' },
      { slug: 'kkl-beads', label: 'KKL beads' },
      { slug: 'dona', label: 'Madona Gigauri' },
      { slug: 'de-08', label: 'D&E' },
    ];

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
        description: 'USD to GEL exchange rate (1 USD = X GEL)',
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
        description:
          'Additional fee percentage for foreign currency payments (e.g., 20 = +20%)',
      },
      { upsert: true, new: true },
    );
    return feePercent;
  }

  private normalizeSellerNotificationSuggestions(
    rawValue: any,
  ): SellerNotificationSuggestion[] {
    if (!Array.isArray(rawValue)) {
      return this.DEFAULT_SELLER_NOTIFICATION_SUGGESTIONS;
    }

    const normalized = rawValue
      .map((item) => {
        const slug = String(item?.slug || '').trim();
        const label = String(item?.label || '').trim();
        if (!slug || !label) return null;
        return { slug, label };
      })
      .filter((item): item is SellerNotificationSuggestion => Boolean(item));

    return normalized.length
      ? normalized
      : this.DEFAULT_SELLER_NOTIFICATION_SUGGESTIONS;
  }

  async getSellerNotificationSuggestions(): Promise<
    SellerNotificationSuggestion[]
  > {
    const setting = await this.settingsModel.findOne({
      key: this.SELLER_NOTIFICATION_SUGGESTIONS_KEY,
    });

    return this.normalizeSellerNotificationSuggestions(setting?.value);
  }

  async setSellerNotificationSuggestions(
    suggestions: SellerNotificationSuggestion[],
  ): Promise<SellerNotificationSuggestion[]> {
    const normalized = this.normalizeSellerNotificationSuggestions(suggestions);

    await this.settingsModel.findOneAndUpdate(
      { key: this.SELLER_NOTIFICATION_SUGGESTIONS_KEY },
      {
        key: this.SELLER_NOTIFICATION_SUGGESTIONS_KEY,
        value: normalized,
        description:
          'Suggestions used for daily seller notification cards (slug + label)',
      },
      { upsert: true, new: true },
    );

    return normalized;
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
