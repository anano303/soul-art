import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Category, CategoryDocument } from '../schemas/category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { DEFAULT_CATEGORY_STRUCTURE } from '../categories.constants';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  async findAll(includeInactive = false): Promise<Category[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return this.categoryModel.find(filter).sort({ name: 1 }).exec();
  }

  async findById(id: string): Promise<Category> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid category ID format: ${id}`);
    }

    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async findByName(name: string): Promise<Category> {
    if (!name || name.trim() === '') {
      throw new BadRequestException('Category name cannot be empty');
    }

    const category = await this.categoryModel
      .findOne({ name: name.trim() })
      .exec();
    if (!category) {
      throw new NotFoundException(`Category with name ${name} not found`);
    }
    return category;
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Normalize name to prevent duplicates with different cases or whitespace
    const normalizedName = createCategoryDto.name.trim();

    // Check if a category with the same name exists (case insensitive)
    const existingCategory = await this.categoryModel
      .findOne({
        name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
      })
      .exec();

    if (existingCategory) {
      throw new ConflictException(
        `Category with name "${normalizedName}" already exists`,
      );
    }

    // Create new category without any code field
    const newCategory = new this.categoryModel({
      name: normalizedName,
      description: createCategoryDto.description,
      isActive: createCategoryDto.isActive ?? true,
    });

    return newCategory.save();
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    // Check if updating name and if it already exists
    if (updateCategoryDto.name) {
      const existingCategory = await this.categoryModel
        .findOne({
          name: updateCategoryDto.name,
          _id: { $ne: id },
        })
        .exec();

      if (existingCategory) {
        throw new ConflictException(
          `Category with name ${updateCategoryDto.name} already exists`,
        );
      }
    }

    const updatedCategory = await this.categoryModel
      .findByIdAndUpdate(id, updateCategoryDto, { new: true })
      .exec();

    if (!updatedCategory) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return updatedCategory;
  }

  async remove(id: string): Promise<void> {
    const result = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
  }

  getDefaultAttributes() {
    return DEFAULT_CATEGORY_STRUCTURE;
  }
}
