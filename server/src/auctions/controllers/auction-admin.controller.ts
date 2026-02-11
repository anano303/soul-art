import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuctionAdminService } from '../services/auction-admin.service';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { UserDocument } from '../../users/schemas/user.schema';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '../../types/role.enum';

@Controller('auctions/admin')
export class AuctionAdminController {
  constructor(private readonly auctionAdminService: AuctionAdminService) {}

  // Admin: Get auction settings
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('settings')
  async getSettings() {
    return this.auctionAdminService.getSettings();
  }

  // Admin: Update auction settings (commission percentages)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch('settings')
  async updateSettings(
    @CurrentUser() user: UserDocument,
    @Body()
    body: {
      platformCommissionPercent?: number;
      auctionAdminCommissionPercent?: number;
      auctionAdminUserId?: string;
    },
  ) {
    return this.auctionAdminService.updateSettings(user._id.toString(), body);
  }

  // Auction Admin: Get dashboard
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AuctionAdmin)
  @Get('dashboard')
  async getDashboard(@CurrentUser() user: UserDocument) {
    return this.auctionAdminService.getAuctionAdminDashboard(
      user._id.toString(),
    );
  }

  // Auction Admin: Get paid auctions with buyer/seller info
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AuctionAdmin)
  @Get('paid-auctions')
  async getPaidAuctions(
    @CurrentUser() user: UserDocument,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.auctionAdminService.getPaidAuctions(
      user._id.toString(),
      page,
      limit,
    );
  }

  // Auction Admin: Get earnings history
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AuctionAdmin)
  @Get('earnings')
  async getEarningsHistory(
    @CurrentUser() user: UserDocument,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.auctionAdminService.getEarningsHistory(
      user._id.toString(),
      page,
      limit,
    );
  }

  // Auction Admin: Get profile with bank details
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AuctionAdmin)
  @Get('profile')
  async getProfile(@CurrentUser() user: UserDocument) {
    return this.auctionAdminService.getProfile(user._id.toString());
  }

  // Auction Admin: Update profile (bank details)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AuctionAdmin)
  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body()
    body: {
      identificationNumber?: string;
      accountNumber?: string;
      beneficiaryBankCode?: string;
      phoneNumber?: string;
    },
  ) {
    return this.auctionAdminService.updateProfile(user._id.toString(), body);
  }

  // Auction Admin: Request withdrawal
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AuctionAdmin)
  @Post('withdrawal')
  async requestWithdrawal(
    @CurrentUser() user: UserDocument,
    @Body() body: { amount?: number },
  ) {
    return this.auctionAdminService.requestWithdrawal(
      user._id.toString(),
      body.amount,
    );
  }

  // Auction Admin: Get withdrawal history
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AuctionAdmin)
  @Get('withdrawals')
  async getWithdrawalHistory(
    @CurrentUser() user: UserDocument,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.auctionAdminService.getWithdrawalHistory(
      user._id.toString(),
      page,
      limit,
    );
  }

  // Admin: Get all pending auction admin withdrawals
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('pending-withdrawals')
  async getAllPendingWithdrawals(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.auctionAdminService.getAllPendingWithdrawals(page, limit);
  }

  // Admin: Get all withdrawals (history)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('all-withdrawals')
  async getAllWithdrawals(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('status') status?: string,
  ) {
    return this.auctionAdminService.getAllWithdrawals(page, limit, status);
  }

  // Admin: Process withdrawal (approve/reject)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch('withdrawals/:id/process')
  async processWithdrawal(
    @CurrentUser() user: UserDocument,
    @Param('id') withdrawalId: string,
    @Body()
    body: {
      action: 'approve' | 'reject';
      transactionId?: string;
      rejectionReason?: string;
    },
  ) {
    return this.auctionAdminService.processWithdrawal(
      user._id.toString(),
      withdrawalId,
      body.action,
      body.transactionId,
      body.rejectionReason,
    );
  }
}
