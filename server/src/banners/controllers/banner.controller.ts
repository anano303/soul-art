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
import { uploadRateLimit } from '@/middleware/security.middleware';
import { createRateLimitInterceptor } from '@/interceptors/rate-limit.interceptor';
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
  @UseInterceptors(createRateLimitInterceptor(uploadRateLimit))
  async create(
    @Body() createBannerDto: CreateBannerDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    try {
      console.log('Creating banner, received images:', images);
      console.log('Images length:', images?.length);
      console.log('CreateBannerDto:', createBannerDto);

      // Validate that image is provided
      if (!images || images.length === 0) {
        console.log('No images provided, throwing error');
        throw new HttpException(
          'Banner image is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      let imageUrl = '';

      try {
        console.log('Uploading image to Cloudinary, file:', images[0]);
        // Upload image to Cloudinary with banner optimization
        imageUrl = await this.appService.uploadBannerImageToCloudinary(
          images[0],
        );
        console.log('Image uploaded successfully, URL:', imageUrl);
      } catch (uploadError) {
        console.error('Failed to upload banner image:', uploadError);
        throw new HttpException(
          'Failed to upload banner image',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const { images: _, ...bannerData } = createBannerDto;

      const banner = await this.bannerService.create({
        ...bannerData,
        imageUrl,
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
  @UseInterceptors(createRateLimitInterceptor(uploadRateLimit))
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

      const { images: _, ...updateData } = updateBannerDto;

      const banner = await this.bannerService.update(id, {
        ...updateData,
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
