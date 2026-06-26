import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/guards/optional-jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';
import { Roles } from '@/decorators/roles.decorator';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { Role } from '@/types/role.enum';
import { UserDocument } from '@/users/schemas/user.schema';
import { PriceOffersService } from './services/price-offers.service';
import { CreateOfferDto } from './dtos/create-offer.dto';
import { RespondOfferDto } from './dtos/respond-offer.dto';

@Controller('price-offers')
export class PriceOffersController {
  constructor(private readonly service: PriceOffersService) {}

  // Anyone can make an offer; auth is optional (inline registration otherwise).
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(@Body() dto: CreateOfferDto, @CurrentUser() user?: UserDocument) {
    return this.service.create(dto, user);
  }

  // The current user's accepted offer for a product (for the product page).
  // Returns { offeredPrice, ... } or null.
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(
    @CurrentUser() user: UserDocument,
    @Query('productId') productId: string,
  ) {
    return this.service.getAcceptedOffer(String(user._id), productId);
  }

  // Seller's own incoming offers.
  @Get('seller')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.Seller,
    Role.SellerAndSalesManager,
    Role.Admin,
  )
  forSeller(
    @CurrentUser() user: UserDocument,
    @Query('status') status?: string,
  ) {
    return this.service.findForSeller(user._id.toString(), status);
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  accept(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body() dto: RespondOfferDto,
  ) {
    return this.service.respond(id, user, 'accept', dto);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  reject(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body() dto: RespondOfferDto,
  ) {
    return this.service.respond(id, user, 'reject', dto);
  }

  // Admin: see every offer + seller responses.
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
}
