import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
  UseInterceptors,
  Delete,
  UploadedFile,
} from '@nestjs/common';
import { AuctionService } from '../services/auction.service';
import {
  CreateAuctionDto,
  PlaceBidDto,
  AuctionFilterDto,
  AdminCreateAuctionDto,
  RescheduleAuctionDto,
  WinnerPaymentDto,
  InitializeBogPaymentDto,
} from '../dtos/auction.dto';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { UserDocument } from '../../users/schemas/user.schema';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '../../types/role.enum';
import { createRateLimitInterceptor } from '../../interceptors/rate-limit.interceptor';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';

// Rate limiting for auction actions
const auctionRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 actions per window
};

const bidRateLimit = {
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 bids per minute
};

@Controller('auctions')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  // Public: Get all active auctions
  @Get()
  async getAuctions(@Query() filters: AuctionFilterDto) {
    return this.auctionService.getAuctions(filters);
  }

  // Public: Get available filter options (materials and dimensions from active auctions)
  @Get('filters/options')
  async getFilterOptions() {
    return this.auctionService.getFilterOptions();
  }

  // Public: Get lightweight bid status for polling (no auth required)
  @Get(':id/bid-status')
  async getBidStatus(@Param('id') id: string) {
    return this.auctionService.getAuctionBidStatus(id);
  }

  // Public: Long-polling endpoint - waits for updates
  @Get(':id/bid-status/poll')
  async getBidStatusPoll(
    @Param('id') id: string,
    @Query('lastTotalBids') lastTotalBids: string,
    @Query('lastEndDate') lastEndDate: string,
    @Query('timeout') timeout: string = '30000',
  ) {
    return this.auctionService.getAuctionBidStatusLongPoll(
      id,
      lastTotalBids ? parseInt(lastTotalBids, 10) : undefined,
      lastEndDate,
      Math.min(parseInt(timeout, 10) || 30000, 30000), // Cap at 30 seconds
    );
  }

  // Public: Get auction comments
  @Get(':id/comments')
  async getComments(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.auctionService.getAuctionComments(
      id,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  // Authenticated: Add comment to auction
  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body('content') content: string,
  ) {
    return this.auctionService.addAuctionComment(id, user, content);
  }

  // Public: Get single auction
  @Get(':id')
  async getAuction(@Param('id') id: string) {
    return this.auctionService.getAuctionById(id);
  }

  // Seller or AuctionAdmin: Create new auction
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller, Role.AuctionAdmin)
  @UseInterceptors(createRateLimitInterceptor(auctionRateLimit))
  @Post()
  async createAuction(
    @CurrentUser() user: UserDocument,
    @Body() createAuctionDto: CreateAuctionDto,
  ) {
    // AuctionAdmin can create auction for any seller (uses sellerId from DTO)
    // Seller creates auction for themselves
    const sellerId =
      user.role === Role.AuctionAdmin && createAuctionDto.sellerId
        ? createAuctionDto.sellerId
        : user._id.toString();
    return this.auctionService.createAuction(sellerId, createAuctionDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller, Role.Admin, Role.AuctionAdmin)
  @Post('media/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAuctionImage(@UploadedFile() file: Express.Multer.File) {
    return this.auctionService.uploadAuctionImage(file);
  }

  // User: Place bid
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(createRateLimitInterceptor(bidRateLimit))
  @Post('bid')
  async placeBid(
    @CurrentUser() user: UserDocument,
    @Body() placeBidDto: PlaceBidDto,
  ) {
    return this.auctionService.placeBid(user._id.toString(), placeBidDto);
  }

  // Seller: Get own auctions
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  @Get('seller/my-auctions')
  async getSellerAuctions(
    @CurrentUser() user: UserDocument,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.auctionService.getSellerAuctions(
      user._id.toString(),
      page,
      limit,
    );
  }

  // Seller: Get auction earnings summary
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  @Get('seller/earnings')
  async getSellerAuctionEarnings(
    @CurrentUser() user: UserDocument,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.auctionService.getSellerAuctionEarnings(
      user._id.toString(),
      page,
      limit,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller, Role.Admin, Role.AuctionAdmin)
  @Patch(':id/reschedule')
  async rescheduleAuction(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body() payload: RescheduleAuctionDto,
  ) {
    const isAdmin = user.role === Role.Admin || user.role === Role.AuctionAdmin;
    return this.auctionService.rescheduleAuction(
      id,
      user._id.toString(),
      payload,
      isAdmin,
    );
  }

  // User: Get own bids
  @UseGuards(JwtAuthGuard)
  @Get('user/my-bids')
  async getUserBids(
    @CurrentUser() user: UserDocument,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.auctionService.getUserBids(user._id.toString(), page, limit);
  }

  // Admin or AuctionAdmin: Approve auction
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.AuctionAdmin)
  @Patch(':id/approve')
  async approveAuction(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.auctionService.approveAuction(id, user._id.toString());
  }

  // Admin or AuctionAdmin: Reject auction
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.AuctionAdmin)
  @Patch(':id/reject')
  async rejectAuction(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.auctionService.rejectAuction(id, reason, user._id.toString());
  }

  // Admin or AuctionAdmin: Mark as paid
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.AuctionAdmin)
  @Patch(':id/mark-paid')
  async markAsPaid(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.auctionService.markAuctionAsPaid(id, user._id.toString());
  }

  // Admin or AuctionAdmin: Cancel auction
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.AuctionAdmin)
  @Delete(':id')
  async cancelAuction(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Query('reason') reason?: string,
  ) {
    return this.auctionService.cancelAuction(id, user._id.toString(), reason);
  }

  // Admin or AuctionAdmin: Get auction statistics
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.AuctionAdmin)
  @Get('admin/stats')
  async getAuctionStats() {
    return this.auctionService.getAuctionStats();
  }

  // Admin or AuctionAdmin: Create auction for seller
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.AuctionAdmin)
  @Post('admin')
  async createAuctionForSeller(@Body() adminDto: AdminCreateAuctionDto) {
    const { sellerId, ...auctionData } = adminDto;
    return this.auctionService.createAuction(
      sellerId,
      auctionData as CreateAuctionDto,
    );
  }

  // Winner: Get won auctions pending payment
  @UseGuards(JwtAuthGuard)
  @Get('my-wins')
  async getMyWonAuctions(@CurrentUser() user: UserDocument) {
    return this.auctionService.getWonAuctions(user._id.toString());
  }

  // Winner: Get all won auctions (both paid and unpaid)
  @UseGuards(JwtAuthGuard)
  @Get('my-wins/all')
  async getAllMyWonAuctions(@CurrentUser() user: UserDocument) {
    return this.auctionService.getAllWonAuctions(user._id.toString());
  }

  // Winner: Get payment details
  @UseGuards(JwtAuthGuard)
  @Get(':id/payment-details')
  async getPaymentDetails(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.auctionService.getPaymentDetails(id, user._id.toString());
  }

  // Winner: Confirm payment (legacy - without BOG)
  @UseGuards(JwtAuthGuard)
  @Post(':id/confirm-payment')
  async confirmPayment(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body() paymentDto: WinnerPaymentDto,
  ) {
    return this.auctionService.confirmWinnerPayment(
      id,
      user._id.toString(),
      paymentDto,
    );
  }

  // Winner: Initialize BOG payment
  @UseGuards(JwtAuthGuard)
  @Post(':id/bog/initialize')
  async initializeBogPayment(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body() paymentDto: InitializeBogPaymentDto,
  ) {
    return this.auctionService.initializeBogPayment(
      id,
      user._id.toString(),
      paymentDto.deliveryZone,
      paymentDto.shippingAddress,
    );
  }

  // Winner: Verify BOG payment status
  @UseGuards(JwtAuthGuard)
  @Get(':id/bog/verify')
  async verifyBogPayment(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.auctionService.verifyBogPayment(id, user._id.toString());
  }
}
