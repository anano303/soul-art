import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ShippingCountry, ShippingCountryDocument } from './schemas/shipping-country.schema';

@Injectable()
export class ShippingCountriesService {
  constructor(
    @InjectModel(ShippingCountry.name)
    private shippingCountryModel: Model<ShippingCountryDocument>,
  ) {}

  async findAll(): Promise<ShippingCountry[]> {
    return this.shippingCountryModel.find({ isActive: true }).exec();
  }

  async findOne(countryCode: string): Promise<ShippingCountry | null> {
    return this.shippingCountryModel.findOne({ 
      countryCode: countryCode.toUpperCase(), 
      isActive: true 
    }).exec();
  }

  async create(data: {
    countryCode: string;
    countryName: string;
    cost: number;
    isFree?: boolean;
  }): Promise<ShippingCountry> {
    const country = new this.shippingCountryModel({
      countryCode: data.countryCode.toUpperCase(),
      countryName: data.countryName,
      cost: data.isFree ? 0 : data.cost,
      isFree: data.isFree || false,
      isActive: true,
    });
    return country.save();
  }

  async update(
    countryCode: string,
    data: {
      countryName?: string;
      cost?: number;
      isFree?: boolean;
      isActive?: boolean;
    },
  ): Promise<ShippingCountry | null> {
    const updateData: any = { ...data };
    
    // If marking as free, set cost to 0
    if (data.isFree) {
      updateData.cost = 0;
    }
    
    return this.shippingCountryModel.findOneAndUpdate(
      { countryCode: countryCode.toUpperCase() },
      updateData,
      { new: true },
    ).exec();
  }

  async delete(countryCode: string): Promise<boolean> {
    // Soft delete by marking as inactive
    const result = await this.shippingCountryModel.updateOne(
      { countryCode: countryCode.toUpperCase() },
      { isActive: false },
    ).exec();
    return result.modifiedCount > 0;
  }

  async initializeDefaultCountries(): Promise<void> {
    const existingCount = await this.shippingCountryModel.countDocuments().exec();
    
    // Only initialize if no countries exist
    if (existingCount === 0) {
      const defaultCountries = [
        { countryCode: 'GE', countryName: 'საქართველო', cost: 0, isFree: true },
        { countryCode: 'IT', countryName: 'Italy', cost: 200, isFree: false },
        { countryCode: 'DE', countryName: 'Germany', cost: 200, isFree: false },
        { countryCode: 'FR', countryName: 'France', cost: 200, isFree: false },
        { countryCode: 'ES', countryName: 'Spain', cost: 200, isFree: false },
        { countryCode: 'US', countryName: 'United States', cost: 300, isFree: false },
      ];

      await this.shippingCountryModel.insertMany(defaultCountries);
    }
  }
}
