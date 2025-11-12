import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Ga4AnalyticsService } from './ga4-analytics.service';
import { VisitorTrackingService } from './visitor-tracking.service';
import { AnalyticsController } from './analytics.controller';
import { Visitor, VisitorSchema } from './schemas/visitor.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Visitor.name, schema: VisitorSchema }]),
  ],
  controllers: [AnalyticsController],
  providers: [Ga4AnalyticsService, VisitorTrackingService],
  exports: [Ga4AnalyticsService, VisitorTrackingService],
})
export class AnalyticsModule {}
