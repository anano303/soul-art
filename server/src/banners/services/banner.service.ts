import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner } from '../schemas/banner.schema';
import { CreateBannerDto, UpdateBannerDto } from '../dtos/banner.dto';

@Injectable()
export class BannerService {
  constructor(@InjectModel(Banner.name) private bannerModel: Model<Banner>) {}

  async create(createBannerDto: CreateBannerDto): Promise<Banner> {
    const banner = new this.bannerModel(createBannerDto);
    return banner.save();
  }

  async findAll(): Promise<Banner[]> {
    return this.bannerModel.find().sort({ sortOrder: 1, createdAt: -1 }).exec();
  }

  async findActive(): Promise<Banner[]> {
    return this.bannerModel
      .find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Banner> {
    return this.bannerModel.findById(id).exec();
  }

  async update(id: string, updateBannerDto: UpdateBannerDto): Promise<Banner> {
    return this.bannerModel
      .findByIdAndUpdate(id, updateBannerDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<void> {
    await this.bannerModel.findByIdAndDelete(id).exec();
  }
}
