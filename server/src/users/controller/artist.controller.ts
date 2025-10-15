import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { UpdateArtistProfileDto } from '../dtos/update-artist-profile.dto';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';
import { Roles } from '@/decorators/roles.decorator';
import { Role } from '@/types/role.enum';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { User } from '../schemas/user.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { createRateLimitInterceptor } from '@/interceptors/rate-limit.interceptor';
import { uploadRateLimit } from '@/middleware/security.middleware';

@ApiTags('artists')
@Controller('artists')
export class ArtistController {
  constructor(private readonly usersService: UsersService) {}

  @Get('slug/check')
  @ApiOperation({ summary: 'Check if artist slug is available' })
  @ApiResponse({ status: 200, description: 'Slug availability status' })
  async checkSlugAvailability(
    @Query('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    if (!slug) {
      throw new BadRequestException('slug query parameter is required');
    }

    return this.usersService.isArtistSlugAvailable(slug, excludeId);
  }

  @Get()
  @ApiOperation({ summary: 'List public artist profiles' })
  @ApiResponse({ status: 200, description: 'Public artist listings' })
  async listArtists(@Query('limit') limit: string = '200') {
    const parsedLimit = parseInt(limit, 10);
    const normalizedLimit = Number.isFinite(parsedLimit) ? parsedLimit : 200;

    return this.usersService.listPublicArtists(normalizedLimit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search public artists by keyword' })
  @ApiResponse({ status: 200, description: 'Search results for artists' })
  async searchArtists(@Query('q') keyword?: string, @Query('limit') limit: string = '20') {
    try {
      if (!keyword || keyword.trim().length < 2) {
        return [];
      }
      const parsedLimit = parseInt(limit, 10);
      const normalizedLimit = Number.isFinite(parsedLimit) ? parsedLimit : 20;
      
      return this.usersService.searchPublicArtists(keyword.trim(), normalizedLimit);
    } catch (error) {
      console.error('Search artists error:', error);
      throw new BadRequestException('Failed to search artists');
    }
  }

  @Get(':identifier')
  @ApiOperation({ summary: 'Fetch artist profile by slug or ID' })
  @ApiResponse({
    status: 200,
    description: 'Artist profile with latest products',
  })
  async getArtistProfile(@Param('identifier') identifier: string) {
    return this.usersService.getArtistProfile(identifier);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  @ApiOperation({ summary: 'Update authenticated artist profile' })
  @ApiResponse({ status: 200, description: 'Updated artist profile' })
  async updateArtistProfile(
    @CurrentUser() user: User,
    @Body() body: UpdateArtistProfileDto,
  ) {
    const userId = (user as any)?._id?.toString();

    if (!userId) {
      throw new BadRequestException('Unable to resolve current user');
    }

    await this.usersService.updateArtistProfile(userId, body);

    return this.usersService.getArtistProfile(userId);
  }

  @Post('cover')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  @UseInterceptors(createRateLimitInterceptor(uploadRateLimit))
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload artist cover image' })
  async uploadArtistCover(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = (user as any)?._id?.toString();

    if (!userId) {
      throw new BadRequestException('Unable to resolve current user');
    }

    return this.usersService.uploadArtistCoverImage(userId, file);
  }

  @Post('gallery')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  @UseInterceptors(createRateLimitInterceptor(uploadRateLimit))
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload artist gallery image' })
  async uploadArtistGalleryImage(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = (user as any)?._id?.toString();

    if (!userId) {
      throw new BadRequestException('Unable to resolve current user');
    }

    return this.usersService.addArtistGalleryImage(userId, file);
  }

  @Delete('gallery')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  @ApiOperation({ summary: 'Remove artist gallery image' })
  async removeArtistGalleryImage(
    @CurrentUser() user: User,
    @Body('imageUrl') imageUrl: string,
  ) {
    const userId = (user as any)?._id?.toString();

    if (!userId) {
      throw new BadRequestException('Unable to resolve current user');
    }

    if (!imageUrl) {
      throw new BadRequestException('imageUrl is required');
    }

    return this.usersService.removeArtistGalleryImage(userId, imageUrl);
  }
}
