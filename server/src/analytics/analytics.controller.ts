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
    // Extract real client IP (handle proxies/load balancers)
    let ip = req.ip || req.socket.remoteAddress || 'Unknown';
    
    // Check x-forwarded-for header (used by proxies like Cloudflare, nginx)
    const forwardedFor = req.headers['x-forwarded-for'] as string;
    if (forwardedFor) {
      // x-forwarded-for can be: "client, proxy1, proxy2"
      // We want the first IP (real client)
      ip = forwardedFor.split(',')[0].trim();
    }
    
    // Check cf-connecting-ip header (Cloudflare specific)
    const cfConnectingIp = req.headers['cf-connecting-ip'] as string;
    if (cfConnectingIp) {
      ip = cfConnectingIp;
    }
    
    // Check x-real-ip header (nginx/other proxies)
    const realIp = req.headers['x-real-ip'] as string;
    if (realIp) {
      ip = realIp;
    }

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
