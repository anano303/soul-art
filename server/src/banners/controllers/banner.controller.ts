import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { BannerService } from '../services/banner.service';
import { CreateBannerDto, UpdateBannerDto } from '../dtos/banner.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '../../types/role.enum';
import { AppService } from '../../app/services/app.service';

@Controller('banners')
export class BannerController {
  constructor(
    private readonly bannerService: BannerService,
    private readonly appService: AppService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @UseInterceptors(FilesInterceptor('images', 1)) // Allow only 1 image per banner
  async create(
    @Body() createBannerDto: CreateBannerDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    try {
      let imageUrl = '';

      if (images && images.length > 0) {
        // Upload image to Cloudinary with banner optimization
        imageUrl = await this.appService.uploadBannerImageToCloudinary(
          images[0],
        );
      }

      const banner = await this.bannerService.create({
        ...createBannerDto,
        imageUrl: imageUrl,
      });

      return banner;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error creating banner',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll() {
    return this.bannerService.findAll();
  }

  @Get('active')
  async findActive() {
    return this.bannerService.findActive();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.bannerService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @UseInterceptors(FilesInterceptor('images', 1)) // Allow only 1 image per banner
  async update(
    @Param('id') id: string,
    @Body() updateBannerDto: UpdateBannerDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    try {
      let imageUrl = updateBannerDto.imageUrl;

      if (images && images.length > 0) {
        // Upload image to Cloudinary with banner optimization
        imageUrl = await this.appService.uploadBannerImageToCloudinary(
          images[0],
        );
      }

      const banner = await this.bannerService.update(id, {
        ...updateBannerDto,
        imageUrl: imageUrl,
      });

      return banner;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error updating banner',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async remove(@Param('id') id: string) {
    await this.bannerService.remove(id);
    return { message: 'Banner deleted successfully' };
  }
}
