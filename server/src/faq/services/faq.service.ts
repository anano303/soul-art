import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Faq, FaqDocument } from '../schemas/faq.schema';
import { CreateFaqDto } from '../dtos/create-faq.dto';
import { UpdateFaqDto } from '../dtos/update-faq.dto';

@Injectable()
export class FaqService {
  constructor(@InjectModel(Faq.name) private faqModel: Model<FaqDocument>) {}

  async create(dto: CreateFaqDto): Promise<FaqDocument> {
    // თუ order არ არის მითითებული, ბოლოს დაამატე
    if (dto.order === undefined || dto.order === null) {
      const lastFaq = await this.faqModel
        .findOne()
        .sort({ order: -1 })
        .lean();
      dto.order = lastFaq ? (lastFaq as any).order + 1 : 0;
    }
    return this.faqModel.create(dto);
  }

  async findAll(): Promise<FaqDocument[]> {
    return this.faqModel.find().sort({ order: 1 }).exec();
  }

  async findActive(): Promise<FaqDocument[]> {
    return this.faqModel
      .find({ isActive: true })
      .sort({ order: 1 })
      .exec();
  }

  async findById(id: string): Promise<FaqDocument> {
    const faq = await this.faqModel.findById(id).exec();
    if (!faq) {
      throw new NotFoundException('FAQ not found');
    }
    return faq;
  }

  async update(id: string, dto: UpdateFaqDto): Promise<FaqDocument> {
    const faq = await this.faqModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!faq) {
      throw new NotFoundException('FAQ not found');
    }
    return faq;
  }

  async delete(id: string): Promise<void> {
    const result = await this.faqModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('FAQ not found');
    }
  }

  async reorder(ids: string[]): Promise<void> {
    const bulkOps = ids.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { order: index },
      },
    }));
    await this.faqModel.bulkWrite(bulkOps);
  }
}
