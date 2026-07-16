import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';
import { Roles } from '@/decorators/roles.decorator';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { Role } from '@/types/role.enum';
import { UserDocument } from '@/users/schemas/user.schema';
import { StorageService } from '@/storage/storage.service';
import { CommissionsService } from './services/commissions.service';
import { CreateCommissionDto } from './dtos/create-commission.dto';
import { SubmitOfferDto } from './dtos/submit-offer.dto';
import { SelectOfferDto } from './dtos/select-offer.dto';

@Controller('commissions')
export class CommissionsController {
  constructor(
    private readonly service: CommissionsService,
    private readonly storage: StorageService,
  ) {}

  // Buyer creates a request (with reference photos).
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', 8, {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        cb(null, file.mimetype.startsWith('image/'));
      },
    }),
  )
  async create(
    @Body() dto: CreateCommissionDto,
    @CurrentUser() user: UserDocument,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const urls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        // Uploads to AWS S3 when AWS is enabled (premium-quality, optimized).
        const result = await this.storage.uploadImage(file, {
          folder: 'commissions',
          maxWidth: 2400,
          maxHeight: 2400,
        });
        if (result?.url) urls.push(result.url);
      }
    }
    return this.service.create(dto, user, urls);
  }

  // Buyer's own requests.
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: UserDocument) {
    return this.service.findMine(user._id.toString());
  }

  // Open requests for an opted-in artist.
  @Get('available')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller, Role.SellerAndSalesManager, Role.Admin)
  available(@CurrentUser() user: UserDocument) {
    return this.service.findAvailable(user);
  }

  // Artist's own submitted offers.
  @Get('my-offers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller, Role.SellerAndSalesManager, Role.Admin)
  myOffers(@CurrentUser() user: UserDocument) {
    return this.service.findMyOffers(user._id.toString());
  }

  // Admin: full list.
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  all(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      status,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  // Single request (buyer or admin), offers enriched with artist stats.
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  one(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.service.findOneForBuyer(
      id,
      user._id.toString(),
      user.role === Role.Admin,
    );
  }

  // Artist submits/updates an offer.
  @Post(':id/offer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller, Role.SellerAndSalesManager, Role.Admin)
  offer(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body() dto: SubmitOfferDto,
  ) {
    return this.service.submitOffer(id, user, dto);
  }

  // Buyer selects an offer → returns BOG payment init data.
  @Post(':id/select')
  @UseGuards(JwtAuthGuard)
  select(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body() dto: SelectOfferDto,
  ) {
    return this.service.selectOffer(id, user, dto.offerId);
  }

  // Admin marks the commission completed → releases escrow to the artist.
  // (Primary path is the standard "mark delivered" action on the orders page,
  // which credits the artist via BalanceService — same as product orders.)
  @Put(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  complete(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.service.complete(id, {
      userId: user._id.toString(),
      isAdmin: true,
    });
  }
}
