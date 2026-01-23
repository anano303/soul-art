import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Campaign,
  CampaignDocument,
  CampaignStatus,
  CampaignAppliesTo,
  CampaignDiscountSource,
} from '../schemas/campaign.schema';
import { CreateCampaignDto } from '../dtos/create-campaign.dto';
import { UpdateCampaignDto } from '../dtos/update-campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
  ) {}

  async create(
    dto: CreateCampaignDto,
    userId: string,
  ): Promise<CampaignDocument> {
    const campaign = new this.campaignModel({
      ...dto,
      createdBy: new Types.ObjectId(userId),
      status: CampaignStatus.DRAFT,
    });

    return campaign.save();
  }

  async findAll(status?: CampaignStatus): Promise<CampaignDocument[]> {
    const query: any = {};
    if (status) {
      query.status = status;
    }
    return this.campaignModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<CampaignDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid campaign ID');
    }

    const campaign = await this.campaignModel.findById(id).exec();
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }
    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto): Promise<CampaignDocument> {
    const campaign = await this.findById(id);

    Object.assign(campaign, dto);
    return campaign.save();
  }

  async delete(id: string): Promise<void> {
    const result = await this.campaignModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }
  }

  async activate(id: string): Promise<CampaignDocument> {
    const campaign = await this.findById(id);

    if (campaign.status === CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign is already active');
    }

    // Validate dates
    const now = new Date();
    if (campaign.endDate < now) {
      throw new BadRequestException('Campaign end date has already passed');
    }

    campaign.status = CampaignStatus.ACTIVE;

    this.logger.log(`Campaign activated: ${campaign.name} (${campaign._id})`);

    return campaign.save();
  }

  async deactivate(id: string): Promise<CampaignDocument> {
    const campaign = await this.findById(id);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign is not active');
    }

    campaign.status = CampaignStatus.PAUSED;

    this.logger.log(`Campaign deactivated: ${campaign.name} (${campaign._id})`);

    return campaign.save();
  }

  async endCampaign(id: string): Promise<CampaignDocument> {
    const campaign = await this.findById(id);
    campaign.status = CampaignStatus.ENDED;
    return campaign.save();
  }

  /**
   * Get currently active campaign (if any)
   * Usually only one campaign should be active at a time
   */
  async getActiveCampaign(): Promise<CampaignDocument | null> {
    const now = new Date();

    return this.campaignModel
      .findOne({
        status: CampaignStatus.ACTIVE,
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
      .exec();
  }

  /**
   * Get all active campaigns
   */
  async getActiveCampaigns(): Promise<CampaignDocument[]> {
    const now = new Date();

    return this.campaignModel
      .find({
        status: CampaignStatus.ACTIVE,
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
      .exec();
  }

  /**
   * Calculate campaign discount for a product
   * @param product - The product with price and referralDiscountPercent
   * @param artistDefaultDiscount - Artist's default referral discount (from user profile)
   * @param isReferralVisitor - Whether the visitor came via referral link
   * @returns { discountPercent, discountAmount, campaignId, badgeText }
   */
  async calculateCampaignDiscount(
    product: {
      price: number;
      referralDiscountPercent?: number;
    },
    artistDefaultDiscount?: number,
    isReferralVisitor?: boolean,
  ): Promise<{
    discountPercent: number;
    discountAmount: number;
    finalPrice: number;
    campaignId: string | null;
    campaignName: string | null;
    badgeText: string | null;
    badgeTextGe: string | null;
  } | null> {
    const campaign = await this.getActiveCampaign();

    if (!campaign) {
      return null;
    }

    // Check if campaign applies to this visitor type
    const appliesToAllVisitors = campaign.appliesTo.includes(
      CampaignAppliesTo.ALL_VISITORS,
    );
    const appliesToReferrals = campaign.appliesTo.includes(
      CampaignAppliesTo.INFLUENCER_REFERRALS,
    );

    if (!appliesToAllVisitors && !isReferralVisitor) {
      return null; // Campaign only for referrals, but visitor is not from referral
    }

    if (!appliesToReferrals && isReferralVisitor) {
      // Unusual case - campaign applies to all except referrals
      // For now, allow it
    }

    // Check if product has permission
    const productDiscount = product.referralDiscountPercent ?? 0;

    if (campaign.onlyProductsWithPermission && productDiscount === 0) {
      return null; // Product doesn't allow campaign discounts
    }

    // Determine discount percent based on source
    let discountPercent = 0;

    switch (campaign.discountSource) {
      case CampaignDiscountSource.PRODUCT_REFERRAL_DISCOUNT:
        discountPercent = productDiscount;
        break;
      case CampaignDiscountSource.ARTIST_DEFAULT:
        discountPercent = artistDefaultDiscount ?? productDiscount;
        break;
      case CampaignDiscountSource.OVERRIDE:
        discountPercent = campaign.maxDiscountPercent;
        break;
    }

    // Apply cap if not using override
    if (
      !campaign.useMaxAsOverride &&
      discountPercent > campaign.maxDiscountPercent
    ) {
      discountPercent = campaign.maxDiscountPercent;
    }

    // Calculate amounts
    const discountAmount = Math.round(product.price * (discountPercent / 100));
    const finalPrice = product.price - discountAmount;

    return {
      discountPercent,
      discountAmount,
      finalPrice,
      campaignId: campaign._id.toString(),
      campaignName: campaign.name,
      badgeText: campaign.badgeText || 'Campaign price',
      badgeTextGe: campaign.badgeTextGe || 'აქციის ფასი',
    };
  }

  /**
   * Update campaign analytics
   */
  async updateAnalytics(
    campaignId: string,
    orderAmount: number,
    discountAmount: number,
  ): Promise<void> {
    await this.campaignModel
      .findByIdAndUpdate(campaignId, {
        $inc: {
          totalOrders: 1,
          totalRevenue: orderAmount,
          totalDiscount: discountAmount,
        },
      })
      .exec();
  }

  /**
   * Check and auto-end expired campaigns (called by cron)
   */
  async checkExpiredCampaigns(): Promise<number> {
    const now = new Date();

    const result = await this.campaignModel
      .updateMany(
        {
          status: CampaignStatus.ACTIVE,
          endDate: { $lt: now },
        },
        {
          $set: { status: CampaignStatus.ENDED },
        },
      )
      .exec();

    if (result.modifiedCount > 0) {
      this.logger.log(`Auto-ended ${result.modifiedCount} expired campaigns`);
    }

    return result.modifiedCount;
  }

  /**
   * Check and auto-activate scheduled campaigns (called by cron)
   */
  async checkScheduledCampaigns(): Promise<number> {
    const now = new Date();

    const result = await this.campaignModel
      .updateMany(
        {
          status: CampaignStatus.SCHEDULED,
          startDate: { $lte: now },
          endDate: { $gte: now },
        },
        {
          $set: { status: CampaignStatus.ACTIVE },
        },
      )
      .exec();

    if (result.modifiedCount > 0) {
      this.logger.log(
        `Auto-activated ${result.modifiedCount} scheduled campaigns`,
      );
    }

    return result.modifiedCount;
  }
}
