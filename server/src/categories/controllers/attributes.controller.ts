import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SubCategoryService } from '../services/subCategory.service';
import { CreateColorDto, UpdateColorDto } from '../dto/color.dto';
import { AttributeDto } from '../dto/subcategory.dto';

// ...existing imports...
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';
import { Role } from '@/types/role.enum';
import { Roles } from '@/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ColorService } from '../services/color.service';
import { AgeGroupService } from '../services/age-group.service';
import { CreateAgeGroupDto, UpdateAgeGroupDto } from '../dto/age-group.dto';

@ApiTags('attributes')
@Controller('categories/attributes')
export class AttributesController {
  constructor(
    private readonly subCategoryService: SubCategoryService,
    private readonly colorService: ColorService, // Add this
    private readonly ageGroupService: AgeGroupService, // Add age group service
  ) {}

  @Get('all')
  @ApiOperation({ summary: 'Get attribute options for categories' })
  @ApiResponse({
    status: 200,
    description: 'Returns age groups, sizes, and colors',
  })
  getAttributeOptions() {
    return this.subCategoryService.getAttributeOptions();
  }

  // Color management
  @Get('colors')
  @ApiOperation({ summary: 'Get all available colors from Color collection' })
  @ApiResponse({
    status: 200,
    description: 'Returns all available colors with nameEn',
  })
  async getAllColors() {
    try {
      console.log('Fetching all colors from Color collection');
      const colors = await this.colorService.findAll();
      console.log('Colors fetched:', colors);
      return colors;
    } catch (error) {
      console.error('Error fetching colors:', error);
      throw new BadRequestException('Failed to fetch colors: ' + error.message);
    }
  }
  @Post('colors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new color' })
  @ApiResponse({ status: 201, description: 'The color has been created' })
  createColor(@Body() createColorDto: CreateColorDto) {
    return this.colorService.create(createColorDto);
  }
  @Put('colors/:color')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a color name' })
  @ApiParam({ name: 'color', description: 'Color name to update' })
  @ApiResponse({ status: 200, description: 'The color has been updated' })
  @ApiResponse({ status: 404, description: 'Color not found' })
  async updateColor(
    @Param('color') colorName: string,
    @Body() updateColorDto: UpdateColorDto,
  ) {
    try {
      // Decode URL-encoded Georgian text
      const decodedColorName = decodeURIComponent(colorName);
      console.log('Updating color:', {
        original: colorName,
        decoded: decodedColorName,
      });

      // Find the color by name first
      const colors = await this.colorService.findAll();
      const existingColor = colors.find((c) => c.name === decodedColorName);

      if (!existingColor) {
        throw new BadRequestException(
          `Color with name "${decodedColorName}" not found`,
        );
      }
      console.log('Found existing color:', existingColor);

      // Update using the ObjectId (convert to string)
      return await this.colorService.update(
        existingColor._id.toString(),
        updateColorDto,
      );
    } catch (error) {
      console.error('Error updating color:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update color: ' + error.message);
    }
  }
  @Delete('colors/:color')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a color' })
  @ApiParam({ name: 'color', description: 'Color name to delete' })
  @ApiResponse({ status: 200, description: 'The color has been deleted' })
  @ApiResponse({ status: 404, description: 'Color not found' })
  async deleteColor(@Param('color') colorName: string) {
    try {
      // Decode URL-encoded Georgian text
      const decodedColorName = decodeURIComponent(colorName);
      console.log('Deleting color:', {
        original: colorName,
        decoded: decodedColorName,
      });

      // Find the color by name first
      const colors = await this.colorService.findAll();
      const existingColor = colors.find((c) => c.name === decodedColorName);

      if (!existingColor) {
        throw new BadRequestException(
          `Color with name "${decodedColorName}" not found`,
        );
      } // Delete using the ObjectId (convert to string)
      return await this.colorService.remove(existingColor._id.toString());
    } catch (error) {
      console.error('Error deleting color:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete color: ' + error.message);
    }
  }

  // Size management
  @Get('sizes')
  @ApiOperation({ summary: 'Get all available sizes from subcategories' })
  @ApiResponse({
    status: 200,
    description: 'Returns all available sizes',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  async getAllSizes() {
    try {
      console.log('Fetching all sizes');
      const sizes = await this.subCategoryService.getAllSizes();
      console.log('Sizes fetched:', sizes);
      return sizes;
    } catch (error) {
      console.error('Error fetching sizes:', error);
      throw new BadRequestException('Failed to fetch sizes: ' + error.message);
    }
  }

  @Post('sizes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new size' })
  @ApiResponse({ status: 201, description: 'The size has been created' })
  createSize(@Body() { value }: AttributeDto) {
    return this.subCategoryService.createSize(value);
  }

  @Put('sizes/:size')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a size name' })
  @ApiParam({ name: 'size', description: 'Size to update' })
  @ApiResponse({ status: 200, description: 'The size has been updated' })
  @ApiResponse({ status: 404, description: 'Size not found' })
  updateSize(@Param('size') size: string, @Body() { value }: AttributeDto) {
    return this.subCategoryService.updateSize(size, value);
  }

  @Delete('sizes/:size')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a size' })
  @ApiParam({ name: 'size', description: 'Size to delete' })
  @ApiResponse({ status: 200, description: 'The size has been deleted' })
  @ApiResponse({ status: 404, description: 'Size not found' })
  deleteSize(@Param('size') size: string) {
    return this.subCategoryService.deleteSize(size);
  }
  // Age group management
  @Get('age-groups')
  @ApiOperation({
    summary: 'Get all available age groups from AgeGroup collection',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all available age groups with nameEn',
  })
  async getAllAgeGroups() {
    try {
      console.log('Fetching all age groups from AgeGroup collection');
      const ageGroups = await this.ageGroupService.findAll();
      console.log('Age groups fetched:', ageGroups);
      return ageGroups;
    } catch (error) {
      console.error('Error fetching age groups:', error);
      throw new BadRequestException(
        'Failed to fetch age groups: ' + error.message,
      );
    }
  }
  @Post('age-groups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new age group' })
  @ApiResponse({ status: 201, description: 'The age group has been created' })
  createAgeGroup(@Body() createAgeGroupDto: CreateAgeGroupDto) {
    return this.ageGroupService.create(createAgeGroupDto);
  }
  @Put('age-groups/:ageGroup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an age group name' })
  @ApiParam({ name: 'ageGroup', description: 'Age group to update' })
  @ApiResponse({ status: 200, description: 'The age group has been updated' })
  @ApiResponse({ status: 404, description: 'Age group not found' })
  async updateAgeGroup(
    @Param('ageGroup') ageGroupName: string,
    @Body() updateAgeGroupDto: UpdateAgeGroupDto,
  ) {
    try {
      // Decode URL-encoded Georgian text
      const decodedAgeGroupName = decodeURIComponent(ageGroupName);
      console.log('Updating age group:', {
        original: ageGroupName,
        decoded: decodedAgeGroupName,
      });

      // Find the age group by name first
      const ageGroups = await this.ageGroupService.findAll();
      const existingAgeGroup = ageGroups.find(
        (ag) => ag.name === decodedAgeGroupName,
      );

      if (!existingAgeGroup) {
        throw new BadRequestException(
          `Age group with name "${decodedAgeGroupName}" not found`,
        );
      }
      console.log('Found existing age group:', existingAgeGroup);

      // Update using the ObjectId (convert to string)
      return await this.ageGroupService.update(
        existingAgeGroup._id.toString(),
        updateAgeGroupDto,
      );
    } catch (error) {
      console.error('Error updating age group:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to update age group: ' + error.message,
      );
    }
  }
  @Delete('age-groups/:ageGroup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an age group' })
  @ApiParam({ name: 'ageGroup', description: 'Age group to delete' })
  @ApiResponse({ status: 200, description: 'The age group has been deleted' })
  @ApiResponse({ status: 404, description: 'Age group not found' })
  async deleteAgeGroup(@Param('ageGroup') ageGroupName: string) {
    try {
      // Decode URL-encoded Georgian text
      const decodedAgeGroupName = decodeURIComponent(ageGroupName);
      console.log('Deleting age group:', {
        original: ageGroupName,
        decoded: decodedAgeGroupName,
      });

      // Find the age group by name first
      const ageGroups = await this.ageGroupService.findAll();
      const existingAgeGroup = ageGroups.find(
        (ag) => ag.name === decodedAgeGroupName,
      );

      if (!existingAgeGroup) {
        throw new BadRequestException(
          `Age group with name "${decodedAgeGroupName}" not found`,
        );
      }

      // Delete using the ObjectId (convert to string)
      return await this.ageGroupService.remove(existingAgeGroup._id.toString());
    } catch (error) {
      console.error('Error deleting age group:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to delete age group: ' + error.message,
      );
    }
  }
}
