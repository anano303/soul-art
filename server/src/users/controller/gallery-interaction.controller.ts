import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/guards/optional-jwt-auth.guard';
import { GalleryInteractionService } from '../services/gallery-interaction.service';
import { CreateGalleryCommentDto } from '../dto/gallery-interaction.dto';

@Controller('gallery')
export class GalleryInteractionController {
  constructor(
    private readonly galleryInteractionService: GalleryInteractionService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post(':artistId/:imageUrl/like')
  @HttpCode(HttpStatus.OK)
  async toggleLike(
    @Param('artistId') artistId: string,
    @Param('imageUrl') imageUrl: string,
    @Request() req: any,
  ) {
    // Decode the imageUrl in case it was encoded
    const decodedImageUrl = decodeURIComponent(imageUrl);
    
    return this.galleryInteractionService.toggleLike(
      req.user.id,
      artistId,
      decodedImageUrl,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':artistId/:imageUrl/comments')
  async addComment(
    @Param('artistId') artistId: string,
    @Param('imageUrl') imageUrl: string,
    @Body() createCommentDto: CreateGalleryCommentDto,
    @Request() req: any,
  ) {
    // Decode the imageUrl in case it was encoded
    const decodedImageUrl = decodeURIComponent(imageUrl);
    
    return this.galleryInteractionService.addComment(
      req.user.id,
      artistId,
      decodedImageUrl,
      createCommentDto,
    );
  }

  @Get(':artistId/:imageUrl/comments')
  async getComments(
    @Param('artistId') artistId: string,
    @Param('imageUrl') imageUrl: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    // Decode the imageUrl in case it was encoded
    const decodedImageUrl = decodeURIComponent(imageUrl);
    
    return this.galleryInteractionService.getComments(
      artistId,
      decodedImageUrl,
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':artistId/stats')
  async getInteractionStats(
    @Param('artistId') artistId: string,
    @Query('imageUrls') imageUrls: string,
    @Request() req: any,
  ) {
    // Parse comma-separated image URLs
    const imageUrlArray = imageUrls.split(',').map(url => decodeURIComponent(url.trim()));
    const currentUserId = req.user?.id;
    
    return this.galleryInteractionService.getInteractionStats(
      artistId,
      imageUrlArray,
      currentUserId,
    );
  }
}