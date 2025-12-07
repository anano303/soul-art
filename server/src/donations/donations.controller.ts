import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { DonationsService, CreateDonationDto } from './donations.service';
import { DonationStatus } from './schemas/donation.schema';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';
import { Roles } from '@/decorators/roles.decorator';
import { Role } from '@/types/role.enum';

@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  /**
   * Create a new donation and get payment redirect URL
   */
  @Post()
  async createDonation(
    @Body() dto: CreateDonationDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];

    const result = await this.donationsService.createDonation(
      dto,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      donationId: (result.donation as any)._id,
      redirect_url: result.redirect_url,
    };
  }

  /**
   * BOG payment callback endpoint
   */
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(@Body() callbackData: any) {
    return this.donationsService.handleCallback(callbackData);
  }

  /**
   * Get donation status by ID
   */
  @Get(':id/status')
  async getDonationStatus(@Param('id') id: string) {
    const donation = await this.donationsService.findById(id);
    return {
      id: donation._id,
      status: donation.status,
      amount: donation.amount,
      donorName: donation.isAnonymous ? 'ანონიმური' : donation.donorName,
    };
  }

  /**
   * Get public list of sponsors (completed donations that agreed to be shown)
   */
  @Get('sponsors')
  async getSponsors(@Query('limit') limit?: string) {
    const sponsors = await this.donationsService.getPublicSponsors(
      limit ? parseInt(limit, 10) : 50,
    );
    const totals = await this.donationsService.getTotalDonations();

    return {
      sponsors,
      stats: {
        totalAmount: totals.total,
        sponsorCount: totals.count,
      },
    };
  }

  // ============ Admin Endpoints ============

  /**
   * Get all donations (admin only)
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getAllDonations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: DonationStatus,
  ) {
    return this.donationsService.getAllDonations(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  /**
   * Get donation statistics (admin only)
   */
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getStats() {
    return this.donationsService.getStats();
  }

  /**
   * Get single donation details (admin only)
   */
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getDonationDetails(@Param('id') id: string) {
    return this.donationsService.findById(id);
  }
}
