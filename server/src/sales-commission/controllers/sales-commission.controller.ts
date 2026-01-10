import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Role } from '../../types/role.enum';
import { UserDocument } from '../../users/schemas/user.schema';
import { SalesCommissionService } from '../services/sales-commission.service';
import { CommissionStatus } from '../schemas/sales-commission.schema';
import { TrackingEventType } from '../schemas/sales-tracking.schema';

@Controller('sales-commission')
export class SalesCommissionController {
  constructor(
    private readonly salesCommissionService: SalesCommissionService,
  ) {}

  /**
   * Sales Manager-ის რეფერალური კოდის გენერაცია
   */
  @Post('generate-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SalesManager, Role.Admin)
  async generateRefCode(@CurrentUser() user: UserDocument) {
    const code = await this.salesCommissionService.generateSalesRefCode(
      user._id.toString(),
    );
    return { salesRefCode: code };
  }

  /**
   * Sales Manager-ის კომისიები
   */
  @Get('my-commissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SalesManager, Role.Admin)
  async getMyCommissions(
    @CurrentUser() user: UserDocument,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: CommissionStatus,
  ) {
    return this.salesCommissionService.getManagerCommissions(
      user._id.toString(),
      parseInt(page),
      parseInt(limit),
      status,
    );
  }

  /**
   * Sales Manager-ის სტატისტიკა
   */
  @Get('my-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SalesManager, Role.Admin)
  async getMyStats(@CurrentUser() user: UserDocument) {
    const stats = await this.salesCommissionService.getManagerStats(
      user._id.toString(),
    );
    return stats;
  }

  /**
   * Sales Manager-ის რეფერალური კოდი
   */
  @Get('my-ref-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SalesManager, Role.Admin)
  async getMyRefCode(@CurrentUser() user: UserDocument) {
    return {
      salesRefCode: user.salesRefCode || null,
      referralLink: user.salesRefCode
        ? `${process.env.FRONTEND_URL || 'https://soulart.ge'}?ref=${user.salesRefCode}`
        : null,
    };
  }

  /**
   * ყველა Sales Manager-ის სტატისტიკა (Admin-ისთვის)
   */
  @Get('admin/all-managers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getAllManagersStats() {
    return this.salesCommissionService.getAllManagersStats();
  }

  /**
   * Pending withdrawal-ები (Admin-ისთვის)
   */
  @Get('admin/pending-withdrawals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getPendingWithdrawals() {
    return this.salesCommissionService.getPendingWithdrawals();
  }

  /**
   * კონკრეტული მენეჯერის კომისიები (Admin-ისთვის)
   */
  @Get('admin/manager/:managerId/commissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getManagerCommissionsAdmin(
    @Param('managerId') managerId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.salesCommissionService.getManagerCommissions(
      managerId,
      parseInt(page),
      parseInt(limit),
    );
  }

  /**
   * რეფერალური კოდის ვალიდაცია (Public)
   */
  @Get('validate/:code')
  async validateCode(@Param('code') code: string) {
    const isValid =
      await this.salesCommissionService.validateSalesRefCode(code);
    return { valid: isValid };
  }

  // ========== TRACKING ENDPOINTS ==========

  /**
   * ტრეკინგ ივენტის დამატება (Public - გამოიყენება frontend-იდან)
   */
  @Post('track')
  async trackEvent(
    @Body()
    body: {
      salesRefCode: string;
      eventType: TrackingEventType;
      visitorId?: string;
      userId?: string;
      email?: string;
      orderId?: string;
      orderAmount?: number;
      productId?: string;
      referrerUrl?: string;
      landingPage?: string;
    },
    @Req() req: Request,
  ) {
    const tracking = await this.salesCommissionService.trackEvent({
      ...body,
      userAgent: req.headers['user-agent'],
      ipAddress:
        (req.headers['x-forwarded-for'] as string) ||
        req.socket.remoteAddress ||
        '',
    });
    return { success: !!tracking };
  }

  /**
   * Sales Manager-ის ფანელის სტატისტიკა
   */
  @Get('my-funnel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SalesManager, Role.Admin)
  async getMyFunnelStats(
    @CurrentUser() user: UserDocument,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesCommissionService.getManagerFunnelStats(
      user._id.toString(),
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Sales Manager-ის დეტალური ტრეკინგ მონაცემები
   */
  @Get('my-tracking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SalesManager, Role.Admin)
  async getMyTrackingDetails(
    @CurrentUser() user: UserDocument,
    @Query('eventType') eventType?: TrackingEventType,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.salesCommissionService.getManagerTrackingDetails(
      user._id.toString(),
      eventType,
      parseInt(page),
      parseInt(limit),
    );
  }

  /**
   * Sales Manager-ის დღიური სტატისტიკა
   */
  @Get('my-daily-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SalesManager, Role.Admin)
  async getMyDailyStats(
    @CurrentUser() user: UserDocument,
    @Query('days') days = '30',
  ) {
    return this.salesCommissionService.getManagerDailyStats(
      user._id.toString(),
      parseInt(days),
    );
  }

  /**
   * Sales Manager-ის ბალანსი (გატანისთვის)
   */
  @Get('my-balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SalesManager, Role.Admin)
  async getMyBalance(@CurrentUser() user: UserDocument) {
    return this.salesCommissionService.getManagerBalance(user._id.toString());
  }

  /**
   * თანხის გატანის მოთხოვნა
   */
  @Post('withdrawal/request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SalesManager)
  async requestWithdrawal(
    @CurrentUser() user: UserDocument,
    @Body() body: { amount: number },
  ) {
    const { amount } = body;

    if (!amount || amount <= 0) {
      throw new BadRequestException('თანხა უნდა იყოს დადებითი რიცხვი');
    }

    if (amount < 1) {
      throw new BadRequestException('მინიმალური გასატანი თანხაა 1 ლარი');
    }

    try {
      const result = await this.salesCommissionService.requestWithdrawal(
        user._id.toString(),
        amount,
      );
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
