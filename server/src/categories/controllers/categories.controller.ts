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
import { CategoryService } from '../services/category.service';

import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
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
import { CategoryResponseDto } from '../dto/category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoryService: CategoryService) {}

  // Main category endpoints only
  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive categories',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all categories',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '60d21b4667d0d8992e610c85' },
          name: { type: 'string', example: 'ტანსაცმელი' },
          description: {
            type: 'string',
            example: 'სხვადასხვა ტიპის ტანსაცმელი',
          },
          isActive: { type: 'boolean', example: true },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2023-06-20T12:00:00Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2023-06-20T12:00:00Z',
          },
        },
      },
    },
  })
  findAllCategories(@Query('includeInactive') includeInactive?: string) {
    return this.categoryService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the category',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '60d21b4667d0d8992e610c85' },
        name: { type: 'string', example: 'ტანსაცმელი' },
        description: { type: 'string', example: 'სხვადასხვა ტიპის ტანსაცმელი' },
        isActive: { type: 'boolean', example: true },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2023-06-20T12:00:00Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2023-06-20T12:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findCategoryById(@Param('id') id: string) {
    return this.categoryService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: 201,
    description: 'The category has been created',
    type: CategoryResponseDto,
  })
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'The category has been updated' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'The category has been deleted' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  removeCategory(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
