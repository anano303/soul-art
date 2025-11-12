import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Ga4AnalyticsService } from './ga4-analytics.service';
import { VisitorTrackingService } from './visitor-tracking.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../types/role.enum';
import { Request } from 'express';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly ga4Service: Ga4AnalyticsService,
    private readonly visitorService: VisitorTrackingService,
  ) {}

  @Get('ga4')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getGA4Analytics(@Query('days') days?: string) {
    const daysAgo = days ? parseInt(days) : 7;
    return this.ga4Service.getAnalyticsData(daysAgo);
  }

  @Get('ga4/errors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getGA4Errors(
    @Query('days') days?: string,
    @Query('errorType') errorType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const daysAgo = days ? parseInt(days) : 7;
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 30;
    return this.ga4Service.getDetailedErrors(
      daysAgo,
      errorType,
      pageNum,
      limitNum,
    );
  }

  @Get('ga4/realtime')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getRealtimeUsers() {
    return this.ga4Service.getRealtimeUsers();
  }

  // Visitor Tracking - Public endpoint
  @Post('track-visitor')
  async trackVisitor(@Req() req: Request, @Body() body: any) {
    const ip =
      req.ip ||
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    return this.visitorService.trackVisitor({
      ip,
      userAgent,
      page: body.page || '/',
      referrer: body.referrer,
      sessionId: body.sessionId,
      userId: body.userId,
    });
  }

  // Get Active Visitors - Admin only
  @Get('live-visitors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getLiveVisitors() {
    return this.visitorService.getActiveVisitors();
  }
}
