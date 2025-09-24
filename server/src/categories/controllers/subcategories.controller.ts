import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SubCategoryService } from '../services/subCategory.service';
import {
  CreateSubCategoryDto,
  UpdateSubCategoryDto,
} from '../dto/subcategory.dto';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';
import { Role } from '@/types/role.enum';
import { Roles } from '@/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('subcategories')
@Controller('subcategories')
export class SubCategoriesController {
  constructor(private readonly subCategoryService: SubCategoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all subcategories' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive subcategories',
  })
  @ApiResponse({ status: 200, description: 'Returns all subcategories' })
  findAllSubCategories(
    @Query('categoryId') categoryId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    console.log(
      `[SubCategoriesController] GET /categories/sub request. Query params -> categoryId: "${categoryId}", includeInactive: "${includeInactive}"`,
    );

    // Early validation to prevent unnecessary processing
    if (
      categoryId === 'undefined' ||
      categoryId === 'null' ||
      categoryId === ''
    ) {
      console.warn(
        `[SubCategoriesController] Invalid categoryId received: "${categoryId}". Returning empty array.`,
      );
      return [];
    }

    try {
      // The service method is async, so this will return a Promise
      const subcategoriesPromise = this.subCategoryService.findAll(
        categoryId,
        includeInactive === 'true',
      );
      console.log(
        `[SubCategoriesController] Called subCategoryService.findAll for categoryId: "${categoryId}"`,
      );
      return subcategoriesPromise;
    } catch (error) {
      console.error(
        `[SubCategoriesController] Error in findAllSubCategories for categoryId: "${categoryId}":`,
        error.message,
        error.stack,
      );
      throw error; // Rethrow to let NestJS handle the HTTP response
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subcategory by ID' })
  @ApiParam({ name: 'id', description: 'Subcategory ID' })
  @ApiResponse({ status: 200, description: 'Returns the subcategory' })
  @ApiResponse({ status: 404, description: 'Subcategory not found' })
  findSubCategoryById(@Param('id') id: string) {
    return this.subCategoryService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new subcategory' })
  @ApiResponse({
    status: 201,
    description: 'The subcategory has been created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid data or duplicate subcategory',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  createSubCategory(@Body() createSubCategoryDto: CreateSubCategoryDto) {
    return this.subCategoryService.create(createSubCategoryDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a subcategory' })
  @ApiParam({ name: 'id', description: 'Subcategory ID' })
  @ApiResponse({ status: 200, description: 'The subcategory has been updated' })
  @ApiResponse({ status: 404, description: 'Subcategory not found' })
  updateSubCategory(
    @Param('id') id: string,
    @Body() updateSubCategoryDto: UpdateSubCategoryDto,
  ) {
    return this.subCategoryService.update(id, updateSubCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a subcategory' })
  @ApiParam({ name: 'id', description: 'Subcategory ID' })
  @ApiResponse({ status: 200, description: 'The subcategory has been deleted' })
  @ApiResponse({ status: 404, description: 'Subcategory not found' })
  removeSubCategory(@Param('id') id: string) {
    return this.subCategoryService.remove(id);
  }
}
