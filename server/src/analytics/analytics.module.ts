import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Ga4AnalyticsService } from './ga4-analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [ConfigModule],
  controllers: [AnalyticsController],
  providers: [Ga4AnalyticsService],
  exports: [Ga4AnalyticsService],
})
export class AnalyticsModule {}
