import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Visitor } from './schemas/visitor.schema';

@Injectable()
export class VisitorTrackingService {
  private readonly logger = new Logger(VisitorTrackingService.name);

  constructor(
    @InjectModel(Visitor.name) private visitorModel: Model<Visitor>,
  ) {}

  /**
   * Track a visitor session
   */
  async trackVisitor(data: {
    ip: string;
    userAgent: string;
    page: string;
    referrer?: string;
    sessionId: string;
    userId?: string;
  }) {
    try {
      const deviceInfo = this.parseUserAgent(data.userAgent);

      // Check if visitor already exists with this sessionId (within last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const existingVisitor = await this.visitorModel.findOne({
        sessionId: data.sessionId,
        lastActivity: { $gte: thirtyMinutesAgo },
      });

      if (existingVisitor) {
        // Update existing visitor
        existingVisitor.lastActivity = new Date();
        existingVisitor.pageViews += 1;
        existingVisitor.page = data.page;
        existingVisitor.isActive = true;
        if (data.userId) {
          existingVisitor.userId = data.userId;
        }
        await existingVisitor.save();
        return existingVisitor;
      }

      // Create new visitor entry
      const visitor = new this.visitorModel({
        ip: data.ip,
        userAgent: data.userAgent,
        page: data.page,
        referrer: data.referrer || 'Direct',
        sessionId: data.sessionId,
        userId: data.userId,
        device: deviceInfo.device,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        lastActivity: new Date(),
        isActive: true,
      });

      await visitor.save();
      this.logger.log(
        `New visitor tracked: ${data.ip} - ${deviceInfo.device} - ${data.page}`,
      );
      return visitor;
    } catch (error) {
      this.logger.error('Error tracking visitor:', error);
      throw error;
    }
  }

  /**
   * Get active visitors (last 30 minutes)
   */
  async getActiveVisitors() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const activeVisitors = await this.visitorModel
      .find({
        lastActivity: { $gte: thirtyMinutesAgo },
        isActive: true,
      })
      .sort({ lastActivity: -1 })
      .limit(100)
      .lean();

    return {
      total: activeVisitors.length,
      visitors: activeVisitors.map((v) => ({
        id: v._id,
        ip: v.ip, // Show full IP for admin dashboard
        page: v.page,
        device: v.device,
        browser: v.browser,
        os: v.os,
        country: v.country || 'Unknown',
        city: v.city || 'Unknown',
        referrer: v.referrer,
        pageViews: v.pageViews,
        lastActivity: v.lastActivity,
        userId: v.userId,
      })),
    };
  }

  /**
   * Mark inactive visitors (older than 30 minutes)
   */
  async markInactiveVisitors() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const result = await this.visitorModel.updateMany(
      {
        lastActivity: { $lt: thirtyMinutesAgo },
        isActive: true,
      },
      {
        $set: { isActive: false },
      },
    );

    if (result.modifiedCount > 0) {
      this.logger.log(`Marked ${result.modifiedCount} visitors as inactive`);
    }
  }

  /**
   * Parse User-Agent string to get device info
   */
  private parseUserAgent(userAgent: string) {
    const ua = userAgent.toLowerCase();

    // Detect device
    let device = 'desktop';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
      device = 'tablet';
    } else if (
      /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
        userAgent,
      )
    ) {
      device = 'mobile';
    }

    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('edg/')) browser = 'Edge';
    else if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera';

    // Detect OS
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'MacOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad'))
      os = 'iOS';

    return { device, browser, os };
  }

  /**
   * Mask IP for privacy (show only first 3 octets)
   */
  private maskIP(ip: string): string {
    if (!ip) return 'Unknown';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
    // IPv6 or other format
    return ip.substring(0, Math.min(ip.length, 20)) + '...';
  }
}
