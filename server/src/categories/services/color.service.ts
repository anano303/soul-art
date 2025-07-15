import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Color, ColorDocument } from '../schemas/color.schema';
import { CreateColorDto, UpdateColorDto } from '../dto/color.dto';

@Injectable()
export class ColorService {
  constructor(
    @InjectModel(Color.name) private colorModel: Model<ColorDocument>,
  ) {}

  async findAll(includeInactive = false): Promise<Color[]> {
    try {
      const filter = includeInactive ? {} : { isActive: true };
      const colors = await this.colorModel
        .find(filter)
        .sort({ name: 1 })
        .exec();
      console.log(`Color service found ${colors.length} colors`);
      return colors;
    } catch (error) {
      console.error('Error finding colors:', error);
      return [];
    }
  }

  async findById(id: string): Promise<Color> {
    const color = await this.colorModel.findById(id).exec();
    if (!color) {
      throw new NotFoundException(`Color with ID ${id} not found`);
    }
    return color;
  }

  async create(createColorDto: CreateColorDto): Promise<Color> {
    const existingColor = await this.colorModel
      .findOne({ name: createColorDto.name })
      .exec();
    if (existingColor) {
      throw new ConflictException(
        `Color with name ${createColorDto.name} already exists`,
      );
    }

    const newColor = new this.colorModel(createColorDto);
    return newColor.save();
  }
  async update(id: string, updateColorDto: UpdateColorDto): Promise<Color> {
    // Validate that id is a valid MongoDB ObjectId
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new NotFoundException(`Invalid color ID format: ${id}`);
    }

    if (updateColorDto.name) {
      const existingColor = await this.colorModel
        .findOne({
          name: updateColorDto.name,
          _id: { $ne: id },
        })
        .exec();

      if (existingColor) {
        throw new ConflictException(
          `Color with name ${updateColorDto.name} already exists`,
        );
      }
    }

    const updatedColor = await this.colorModel
      .findByIdAndUpdate(id, updateColorDto, { new: true })
      .exec();

    if (!updatedColor) {
      throw new NotFoundException(`Color with ID ${id} not found`);
    }

    return updatedColor;
  }
  async remove(id: string): Promise<void> {
    // Validate that id is a valid MongoDB ObjectId
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new NotFoundException(`Invalid color ID format: ${id}`);
    }

    const result = await this.colorModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Color with ID ${id} not found`);
    }
  }
}
