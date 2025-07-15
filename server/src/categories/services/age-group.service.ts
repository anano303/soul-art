import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AgeGroup, AgeGroupDocument } from '../schemas/age-group.schema';
import { CreateAgeGroupDto, UpdateAgeGroupDto } from '../dto/age-group.dto';

@Injectable()
export class AgeGroupService {
  constructor(
    @InjectModel(AgeGroup.name) private ageGroupModel: Model<AgeGroupDocument>,
  ) {}

  async findAll(includeInactive = false): Promise<AgeGroup[]> {
    try {
      const filter = includeInactive ? {} : { isActive: true };
      const ageGroups = await this.ageGroupModel
        .find(filter)
        .sort({ name: 1 })
        .exec();
      console.log(`Age group service found ${ageGroups.length} age groups`);
      return ageGroups;
    } catch (error) {
      console.error('Error finding age groups:', error);
      return [];
    }
  }

  async findById(id: string): Promise<AgeGroup> {
    const ageGroup = await this.ageGroupModel.findById(id).exec();
    if (!ageGroup) {
      throw new NotFoundException(`Age group with ID ${id} not found`);
    }
    return ageGroup;
  }

  async findByName(name: string): Promise<AgeGroup | null> {
    try {
      const ageGroup = await this.ageGroupModel.findOne({ name }).exec();
      return ageGroup;
    } catch (error) {
      console.error('Error finding age group by name:', error);
      return null;
    }
  }
  async create(createAgeGroupDto: CreateAgeGroupDto): Promise<AgeGroup> {
    const existingAgeGroup = await this.ageGroupModel
      .findOne({ name: createAgeGroupDto.name })
      .exec();
    if (existingAgeGroup) {
      throw new ConflictException(
        `Age group with name ${createAgeGroupDto.name} already exists`,
      );
    }

    const newAgeGroup = new this.ageGroupModel(createAgeGroupDto);
    return newAgeGroup.save();
  }

  async update(
    id: string,
    updateAgeGroupDto: UpdateAgeGroupDto,
  ): Promise<AgeGroup> {
    if (updateAgeGroupDto.name) {
      const existingAgeGroup = await this.ageGroupModel
        .findOne({
          name: updateAgeGroupDto.name,
          _id: { $ne: id },
        })
        .exec();

      if (existingAgeGroup) {
        throw new ConflictException(
          `Age group with name ${updateAgeGroupDto.name} already exists`,
        );
      }
    }

    const updatedAgeGroup = await this.ageGroupModel
      .findByIdAndUpdate(id, updateAgeGroupDto, { new: true })
      .exec();

    if (!updatedAgeGroup) {
      throw new NotFoundException(`Age group with ID ${id} not found`);
    }

    return updatedAgeGroup;
  }

  async remove(id: string): Promise<void> {
    const result = await this.ageGroupModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Age group with ID ${id} not found`);
    }
  }
}
