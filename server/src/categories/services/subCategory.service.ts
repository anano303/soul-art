import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException, // Added for robust error handling
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import {
  SubCategory,
  SubCategoryDocument,
} from '../schemas/subcategory.schema';
import {
  CreateSubCategoryDto,
  UpdateSubCategoryDto,
} from '../dto/subcategory.dto';
import { Category } from '../schemas/category.schema';
import { ColorService } from './color.service';
import { SizeService } from './size.service';
import { AgeGroupService } from './age-group.service';

@Injectable()
export class SubCategoryService {
  constructor(
    @InjectModel(SubCategory.name)
    private subCategoryModel: Model<SubCategoryDocument>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    private readonly colorService: ColorService,
    private readonly sizeService: SizeService,
    private readonly ageGroupService: AgeGroupService,
  ) {}

  async findAll(
    categoryId?: string,
    includeInactive = false,
  ): Promise<SubCategory[]> {
    console.log(
      `[SubCategoryService] findAll called. categoryId: "${categoryId}", includeInactive: ${includeInactive}`,
    );

    const filter: any = includeInactive ? {} : { isActive: true };

    if (categoryId) {
      console.log(
        `[SubCategoryService] Processing with categoryId: "${categoryId}"`,
      );
      if (!isValidObjectId(categoryId)) {
        console.error(
          `[SubCategoryService] Invalid category ID format provided: "${categoryId}"`,
        );
        throw new BadRequestException(
          `Invalid category ID format: ${categoryId}`,
        );
      }

      try {
        const categoryExists = await this.categoryModel
          .findById(categoryId)
          .exec();
        if (!categoryExists) {
          console.warn(
            `[SubCategoryService] Category with ID "${categoryId}" not found in database.`,
          );
          throw new NotFoundException(
            `Category with ID ${categoryId} not found`,
          );
        }
        console.log(
          `[SubCategoryService] Category "${categoryId}" confirmed to exist.`,
        );
        filter.categoryId = categoryId;
      } catch (error) {
        console.error(
          `[SubCategoryService] Error during category existence check for ID "${categoryId}":`,
          error.message,
        );
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }
        // For other errors, throw a generic server error
        throw new InternalServerErrorException(
          `An error occurred while verifying category ID ${categoryId}`,
        );
      }
    } else {
      console.log(
        '[SubCategoryService] No categoryId provided. Fetching subcategories based on isActive status only.',
      );
    }

    try {
      console.log(
        '[SubCategoryService] Executing find query with filter:',
        JSON.stringify(filter),
      );
      const subcategories = await this.subCategoryModel
        .find(filter)
        .populate('categoryId', 'name') // Ensure category name is populated
        .sort({ name: 1 })
        .exec();

      console.log(
        `[SubCategoryService] Database query returned ${subcategories.length} subcategories.`,
      );
      if (subcategories.length > 0) {
        console.log(
          '[SubCategoryService] Example of first subcategory found:',
          JSON.stringify(subcategories[0]),
        );
      } else if (categoryId) {
        console.log(
          `[SubCategoryService] No subcategories found for categoryId: "${categoryId}" with current filters.`,
        );
      }
      return subcategories;
    } catch (error) {
      console.error(
        `[SubCategoryService] Database error while finding subcategories:`,
        error.message,
        error.stack,
      );
      throw new InternalServerErrorException(
        'A database error occurred while retrieving subcategories',
      );
    }
  }

  async findById(id: string): Promise<SubCategory> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid subcategory ID format: ${id}`);
    }

    const subcategory = await this.subCategoryModel
      .findById(id)
      .populate('categoryId', 'name')
      .exec();

    if (!subcategory) {
      throw new NotFoundException(`Subcategory with ID ${id} not found`);
    }

    return subcategory;
  }

  async create(
    createSubCategoryDto: CreateSubCategoryDto,
  ): Promise<SubCategory> {
    // Check if category exists
    const categoryExists = await this.categoryModel
      .findById(createSubCategoryDto.categoryId)
      .exec();

    if (!categoryExists) {
      throw new NotFoundException(
        `Category with ID ${createSubCategoryDto.categoryId} not found`,
      );
    }

    // Check if subcategory with same name exists under the same category
    const existingSubCategory = await this.subCategoryModel
      .findOne({
        name: createSubCategoryDto.name,
        categoryId: createSubCategoryDto.categoryId,
      })
      .exec();

    if (existingSubCategory) {
      throw new ConflictException(
        `Subcategory with name "${createSubCategoryDto.name}" already exists in this category`,
      );
    }

    const newSubCategory = new this.subCategoryModel(createSubCategoryDto);
    return newSubCategory.save();
  }

  async update(
    id: string,
    updateSubCategoryDto: UpdateSubCategoryDto,
  ): Promise<SubCategory> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid subcategory ID format: ${id}`);
    }

    // If updating the category, check if it exists
    if (updateSubCategoryDto.categoryId) {
      const categoryExists = await this.categoryModel
        .findById(updateSubCategoryDto.categoryId)
        .exec();

      if (!categoryExists) {
        throw new NotFoundException(
          `Category with ID ${updateSubCategoryDto.categoryId} not found`,
        );
      }
    }

    // If updating name, check for duplicates
    if (updateSubCategoryDto.name) {
      const existingSubCategory = await this.subCategoryModel
        .findOne({
          name: updateSubCategoryDto.name,
          categoryId: updateSubCategoryDto.categoryId || { $exists: true },
          _id: { $ne: id },
        })
        .exec();

      if (existingSubCategory) {
        throw new ConflictException(
          `Subcategory with name "${updateSubCategoryDto.name}" already exists in this category`,
        );
      }
    }

    const updatedSubCategory = await this.subCategoryModel
      .findByIdAndUpdate(id, updateSubCategoryDto, { new: true })
      .populate('categoryId', 'name')
      .exec();

    if (!updatedSubCategory) {
      throw new NotFoundException(`Subcategory with ID ${id} not found`);
    }

    return updatedSubCategory;
  }

  async remove(id: string): Promise<void> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid subcategory ID format: ${id}`);
    }

    const result = await this.subCategoryModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Subcategory with ID ${id} not found`);
    }
  }

  // Get all attribute options available for categories
  async getAttributeOptions() {
    const colors = await this.getAllColors();
    const sizes = await this.getAllSizes();
    const ageGroups = await this.getAllAgeGroups();

    return {
      colors,
      sizes,
      ageGroups,
    };
  }

  // Global attribute management methods
  async getAllColors(): Promise<string[]> {
    try {
      console.log('Getting all colors from service');
      const colors = await this.colorService.findAll(false);
      console.log(`Found ${colors.length} colors`);
      return colors.map((color) => color.name);
    } catch (error) {
      console.error('Error getting all colors:', error);
      return [];
    }
  }

  async getAllSizes(): Promise<string[]> {
    try {
      console.log('Getting all sizes from service');
      const sizes = await this.sizeService.findAll(false);
      console.log(`Found ${sizes.length} sizes`);
      return sizes.map((size) => size.value);
    } catch (error) {
      console.error('Error getting all sizes:', error);
      return [];
    }
  }

  async getAllAgeGroups(): Promise<string[]> {
    try {
      console.log('Getting all age groups from service');
      const ageGroups = await this.ageGroupService.findAll(false);
      console.log(`Found ${ageGroups.length} age groups`);
      return ageGroups.map((ageGroup) => ageGroup.name);
    } catch (error) {
      console.error('Error getting all age groups:', error);
      return [];
    }
  }

  // Color management
  async createColor(colorName: string): Promise<any> {
    return this.colorService.create({ name: colorName });
  }

  async updateColor(oldName: string, newName: string): Promise<any> {
    const color = await this.colorService
      .findAll()
      .then((colors) => colors.find((c) => c.name === oldName));

    if (!color) {
      throw new NotFoundException(`Color "${oldName}" not found`);
    }

    return this.colorService.update(color._id.toString(), { name: newName });
  }

  async deleteColor(colorName: string): Promise<any> {
    const color = await this.colorService
      .findAll()
      .then((colors) => colors.find((c) => c.name === colorName));

    if (!color) {
      throw new NotFoundException(`Color "${colorName}" not found`);
    }

    return this.colorService.remove(color._id.toString());
  }

  // Size management
  async createSize(sizeValue: string): Promise<any> {
    return this.sizeService.create({ value: sizeValue });
  }

  async updateSize(oldValue: string, newValue: string): Promise<any> {
    const size = await this.sizeService
      .findAll()
      .then((sizes) => sizes.find((s) => s.value === oldValue));

    if (!size) {
      throw new NotFoundException(`Size "${oldValue}" not found`);
    }

    return this.sizeService.update(size._id.toString(), { value: newValue });
  }

  async deleteSize(sizeValue: string): Promise<any> {
    const size = await this.sizeService
      .findAll()
      .then((sizes) => sizes.find((s) => s.value === sizeValue));

    if (!size) {
      throw new NotFoundException(`Size "${sizeValue}" not found`);
    }

    return this.sizeService.remove(size._id.toString());
  }

  // Age group management
  async createAgeGroup(ageGroupName: string): Promise<any> {
    return this.ageGroupService.create({ name: ageGroupName });
  }

  async updateAgeGroup(oldName: string, newName: string): Promise<any> {
    const ageGroup = await this.ageGroupService
      .findAll()
      .then((ageGroups) => ageGroups.find((a) => a.name === oldName));

    if (!ageGroup) {
      throw new NotFoundException(`Age group "${oldName}" not found`);
    }

    return this.ageGroupService.update(ageGroup._id.toString(), {
      name: newName,
    });
  }

  async deleteAgeGroup(ageGroupName: string): Promise<any> {
    const ageGroup = await this.ageGroupService
      .findAll()
      .then((ageGroups) => ageGroups.find((a) => a.name === ageGroupName));

    if (!ageGroup) {
      throw new NotFoundException(`Age group "${ageGroupName}" not found`);
    }

    return this.ageGroupService.remove(ageGroup._id.toString());
  }
}
