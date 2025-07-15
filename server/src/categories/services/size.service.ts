import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Size, SizeDocument } from '../schemas/size.schema';
import { CreateSizeDto, UpdateSizeDto } from '../dto/size.dto';

@Injectable()
export class SizeService {
  constructor(@InjectModel(Size.name) private sizeModel: Model<SizeDocument>) {}

  async findAll(includeInactive = false): Promise<Size[]> {
    try {
      const filter = includeInactive ? {} : { isActive: true };
      const sizes = await this.sizeModel.find(filter).sort({ value: 1 }).exec();
      console.log(`Size service found ${sizes.length} sizes`);
      return sizes;
    } catch (error) {
      console.error('Error finding sizes:', error);
      return [];
    }
  }

  async findById(id: string): Promise<Size> {
    const size = await this.sizeModel.findById(id).exec();
    if (!size) {
      throw new NotFoundException(`Size with ID ${id} not found`);
    }
    return size;
  }

  async create(createSizeDto: CreateSizeDto): Promise<Size> {
    const existingSize = await this.sizeModel
      .findOne({ value: createSizeDto.value })
      .exec();
    if (existingSize) {
      throw new ConflictException(
        `Size with value ${createSizeDto.value} already exists`,
      );
    }

    const newSize = new this.sizeModel(createSizeDto);
    return newSize.save();
  }

  async update(id: string, updateSizeDto: UpdateSizeDto): Promise<Size> {
    if (updateSizeDto.value) {
      const existingSize = await this.sizeModel
        .findOne({
          value: updateSizeDto.value,
          _id: { $ne: id },
        })
        .exec();

      if (existingSize) {
        throw new ConflictException(
          `Size with value ${updateSizeDto.value} already exists`,
        );
      }
    }

    const updatedSize = await this.sizeModel
      .findByIdAndUpdate(id, updateSizeDto, { new: true })
      .exec();

    if (!updatedSize) {
      throw new NotFoundException(`Size with ID ${id} not found`);
    }

    return updatedSize;
  }

  async remove(id: string): Promise<void> {
    const result = await this.sizeModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Size with ID ${id} not found`);
    }
  }
}
