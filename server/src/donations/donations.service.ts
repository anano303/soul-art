import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  Donation,
  DonationDocument,
  DonationStatus,
} from './schemas/donation.schema';

interface BogTokenResponse {
  access_token: string;
}

interface BogPaymentResponse {
  id: string;
  _links: {
    redirect: {
      href: string;
    };
  };
}

export interface CreateDonationDto {
  amount: number;
  donorName: string;
  donorEmail?: string;
  message?: string;
  isAnonymous?: boolean;
  showInSponsors?: boolean;
  userId?: string;
}

@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);

  constructor(
    @InjectModel(Donation.name)
    private readonly donationModel: Model<DonationDocument>,
    private readonly configService: ConfigService,
  ) {}

  private async getToken(): Promise<string> {
    try {
      const clientId = this.configService.get<string>('BOG_CLIENT_ID');
      const clientSecret = this.configService.get<string>('BOG_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        throw new Error('BOG credentials are not configured');
      }

      const response = await axios.post<BogTokenResponse>(
        'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization:
              'Basic ' +
              Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
          },
        },
      );

      return response.data.access_token;
    } catch (error) {
      this.logger.error('BOG Token Error:', error.message);
      throw error;
    }
  }

  async createDonation(
    dto: CreateDonationDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ donation: Donation; redirect_url: string }> {
    const externalOrderId = uuidv4();

    // Create donation record in pending state
    const donation = await this.donationModel.create({
      amount: dto.amount,
      currency: 'GEL',
      donorName: dto.donorName,
      donorEmail: dto.donorEmail,
      message: dto.message,
      isAnonymous: dto.isAnonymous || false,
      showInSponsors: dto.showInSponsors !== false,
      status: DonationStatus.PENDING,
      externalOrderId,
      userId: dto.userId,
      ipAddress,
      userAgent,
    });

    try {
      const token = await this.getToken();

      // Use API_URL directly for donations callback
      const apiUrl =
        this.configService.get('API_URL') || 'https://api.soulart.ge';
      const callbackUrl = `${apiUrl}/donations/callback`;

      const payload = {
        callback_url: callbackUrl,
        capture: 'automatic',
        external_order_id: externalOrderId,
        purchase_units: {
          currency: 'GEL',
          total_amount: dto.amount,
          basket: [
            {
              quantity: 1,
              unit_price: dto.amount,
              product_id: 'DONATION',
              description: 'SoulArt დონაცია',
            },
          ],
        },
        buyer: {
          full_name: dto.donorName,
          email: dto.donorEmail || undefined,
        },
        industry: {
          type: 'ecommerce',
        },
        payment_method: ['card', 'google_pay', 'apple_pay', 'bog_loyalty', 'bog_p2p'],
        ttl: 30, // 30 minutes to complete
        redirect_urls: {
          success: `${this.configService.get('FRONTEND_URL') || 'https://soulart.ge'}/donation/success?id=${donation._id}`,
          fail: `${this.configService.get('FRONTEND_URL') || 'https://soulart.ge'}/donation/fail?id=${donation._id}`,
        },
      };

      const response = await axios.post<BogPaymentResponse>(
        'https://api.bog.ge/payments/v1/ecommerce/orders',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'Accept-Language': 'ka',
            'Idempotency-Key': uuidv4(),
          },
        },
      );

      // Update donation with BOG order ID
      donation.bogOrderId = response.data.id;
      await donation.save();

      this.logger.log(
        `Donation payment created: ${donation._id}, BOG Order: ${response.data.id}`,
      );

      return {
        donation,
        redirect_url: response.data._links.redirect.href,
      };
    } catch (error) {
      this.logger.error('Failed to create BOG payment for donation:', error);

      // Mark donation as failed
      donation.status = DonationStatus.FAILED;
      await donation.save();

      throw error;
    }
  }

  async handleCallback(
    callbackData: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(
        'Donation callback received:',
        JSON.stringify(callbackData, null, 2),
      );

      const {
        external_order_id,
        order_status: { key: status },
        order_id,
      } = callbackData.body;

      const donation = await this.donationModel.findOne({
        externalOrderId: external_order_id,
      });

      if (!donation) {
        this.logger.warn(
          `Donation not found for external_order_id: ${external_order_id}`,
        );
        return { success: false, message: 'Donation not found' };
      }

      if (status === 'completed' || status === 'refund_in_progress') {
        donation.status = DonationStatus.COMPLETED;
        donation.paymentResult = {
          id: order_id,
          status: status,
          update_time: new Date().toISOString(),
        };
        await donation.save();

        this.logger.log(`Donation ${donation._id} marked as completed`);
        return { success: true, message: 'Donation completed successfully' };
      } else if (status === 'rejected' || status === 'error') {
        donation.status = DonationStatus.FAILED;
        await donation.save();

        this.logger.log(`Donation ${donation._id} marked as failed`);
        return { success: false, message: 'Donation payment failed' };
      }

      return { success: true, message: 'Callback processed' };
    } catch (error) {
      this.logger.error('Error processing donation callback:', error);
      return { success: false, message: error.message };
    }
  }

  async findById(id: string): Promise<DonationDocument> {
    const donation = await this.donationModel.findById(id);
    if (!donation) {
      throw new NotFoundException('Donation not found');
    }
    return donation;
  }

  async findByExternalOrderId(
    externalOrderId: string,
  ): Promise<DonationDocument | null> {
    return this.donationModel.findOne({ externalOrderId });
  }

  async getPublicSponsors(limit = 50): Promise<Partial<Donation>[]> {
    const donations = await this.donationModel
      .find({
        status: DonationStatus.COMPLETED,
        showInSponsors: true,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('donorName amount message isAnonymous createdAt')
      .lean();

    // Hide names for anonymous donations
    return donations.map((d) => ({
      ...d,
      donorName: d.isAnonymous ? 'ანონიმური სპონსორი' : d.donorName,
    }));
  }

  async getTotalDonations(): Promise<{ total: number; count: number }> {
    const result = await this.donationModel.aggregate([
      { $match: { status: DonationStatus.COMPLETED } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return result[0] || { total: 0, count: 0 };
  }

  // Admin methods
  async getAllDonations(
    page = 1,
    limit = 20,
    status?: DonationStatus,
  ): Promise<{
    donations: DonationDocument[];
    total: number;
    pages: number;
  }> {
    const query = status ? { status } : {};

    const [donations, total] = await Promise.all([
      this.donationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.donationModel.countDocuments(query),
    ]);

    return {
      donations: donations as DonationDocument[],
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getStats(): Promise<{
    totalAmount: number;
    totalCount: number;
    completedCount: number;
    pendingCount: number;
    failedCount: number;
    averageDonation: number;
    topDonors: Array<{ donorName: string; totalAmount: number; count: number }>;
  }> {
    const [totals, statusCounts, topDonors] = await Promise.all([
      this.donationModel.aggregate([
        { $match: { status: DonationStatus.COMPLETED } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalCount: { $sum: 1 },
            averageDonation: { $avg: '$amount' },
          },
        },
      ]),
      this.donationModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      this.donationModel.aggregate([
        { $match: { status: DonationStatus.COMPLETED, isAnonymous: false } },
        {
          $group: {
            _id: '$donorEmail',
            donorName: { $first: '$donorName' },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            donorName: 1,
            totalAmount: 1,
            count: 1,
          },
        },
      ]),
    ]);

    const statusMap = statusCounts.reduce(
      (acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalAmount: totals[0]?.totalAmount || 0,
      totalCount: totals[0]?.totalCount || 0,
      completedCount: statusMap[DonationStatus.COMPLETED] || 0,
      pendingCount: statusMap[DonationStatus.PENDING] || 0,
      failedCount: statusMap[DonationStatus.FAILED] || 0,
      averageDonation: Math.round(totals[0]?.averageDonation || 0),
      topDonors,
    };
  }
}
