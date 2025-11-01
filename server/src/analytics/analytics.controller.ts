import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Ga4AnalyticsService } from './ga4-analytics.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../types/role.enum';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly ga4Service: Ga4AnalyticsService) {}

  @Get('ga4')
  @Roles(Role.Admin)
  async getGA4Analytics(@Query('days') days?: string) {
    const daysAgo = days ? parseInt(days) : 7;
    return this.ga4Service.getAnalyticsData(daysAgo);
  }
}
