import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Auction,
  AuctionDocument,
  AuctionStatus,
  AuctionBid,
} from '../schemas/auction.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import {
  CreateAuctionDto,
  PlaceBidDto,
  AuctionFilterDto,
  RescheduleAuctionDto,
} from '../dtos/auction.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BalanceService } from '../../users/services/balance.service';
import { EmailService } from '../../email/services/email.services';
import { AwsS3Service } from '../../aws-s3/aws-s3.service';
import { Role } from '../../types/role.enum';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import sharp from 'sharp';

@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);

  constructor(
    @InjectModel(Auction.name) private auctionModel: Model<Auction>,
    @InjectModel(User.name) private userModel: Model<User>,
    private balanceService: BalanceService,
    private emailService: EmailService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  private combineToDateTime(date: string, time: string): Date {
    return new Date(`${date}T${time}:00.000+04:00`);
  }

  private validateSchedule(startDateTime: Date, endDateTime: Date) {
    const now = new Date();

    if (
      Number.isNaN(startDateTime.getTime()) ||
      Number.isNaN(endDateTime.getTime())
    ) {
      throw new BadRequestException('Invalid schedule values supplied');
    }

    if (startDateTime >= endDateTime) {
      throw new BadRequestException(
        'Auction end time must be after start time',
      );
    }

    if (endDateTime <= now) {
      throw new BadRequestException('Auction end time must be in the future');
    }
  }

  // Create new auction
  async createAuction(
    sellerId: string,
    createAuctionDto: CreateAuctionDto,
  ): Promise<AuctionDocument> {
    // Validate seller exists and has seller role
    const seller = await this.userModel.findById(sellerId);
    if (!seller || seller.role !== Role.Seller) {
      throw new BadRequestException(
        'Only verified sellers can create auctions',
      );
    }

    const startDateTime = this.combineToDateTime(
      createAuctionDto.startDate,
      createAuctionDto.startTime,
    );
    const endDateTime = this.combineToDateTime(
      createAuctionDto.endDate,
      createAuctionDto.endTime,
    );

    this.validateSchedule(startDateTime, endDateTime);

    const { startDate, startTime, endDate, endTime, ...rest } =
      createAuctionDto;

    const auction = new this.auctionModel({
      ...rest,
      seller: sellerId,
      startDate: startDateTime,
      startTime,
      endDate: endDateTime,
      endTime,
      currentPrice: createAuctionDto.startingPrice,
      bids: [],
      status: AuctionStatus.PENDING,
      relistCount: 0,
    });

    const savedAuction = await auction.save();
    this.logger.log(
      `New auction created: ${savedAuction._id} by seller: ${sellerId}`,
    );

    return savedAuction;
  }

  // Get all auctions with filters
  async getAuctions(filters: AuctionFilterDto) {
    const {
      artworkType,
      status = 'ACTIVE',
      minPrice,
      maxPrice,
      material,
      page = 1,
      limit = 12,
    } = filters;

    const query: any = {};

    let normalizedStatus = status?.toString().toUpperCase();

    if (!normalizedStatus) {
      normalizedStatus = AuctionStatus.ACTIVE;
    }

    if (normalizedStatus !== 'ALL') {
      if (
        !Object.values(AuctionStatus).includes(
          normalizedStatus as AuctionStatus,
        )
      ) {
        throw new BadRequestException('Invalid auction status filter');
      }

      query.status = normalizedStatus;
    }

    if (artworkType) query.artworkType = artworkType;
    if (material) query.material = new RegExp(material, 'i');

    if (minPrice || maxPrice) {
      query.currentPrice = {};
      if (minPrice) query.currentPrice.$gte = minPrice;
      if (maxPrice) query.currentPrice.$lte = maxPrice;
    }

    const skip = (page - 1) * limit;

    const [auctions, total] = await Promise.all([
      this.auctionModel
        .find(query)
        .populate('seller', 'name ownerFirstName ownerLastName storeName')
        .populate('currentWinner', 'name ownerFirstName ownerLastName')
        .sort({ endDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.auctionModel.countDocuments(query),
    ]);

    return {
      auctions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    };
  }

  // Get single auction with full details
  async getAuctionById(auctionId: string): Promise<AuctionDocument | null> {
    if (!Types.ObjectId.isValid(auctionId)) {
      throw new BadRequestException('Invalid auction ID');
    }

    const auction = await this.auctionModel
      .findById(auctionId)
      .populate('seller', 'name ownerFirstName ownerLastName storeName email phone')
      .populate('currentWinner', 'name ownerFirstName ownerLastName')
      .populate('bids.bidder', 'name ownerFirstName ownerLastName');

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    return auction;
  }

  // Place a bid
  async placeBid(
    bidderId: string,
    placeBidDto: PlaceBidDto,
  ): Promise<AuctionDocument> {
    const { auctionId, bidAmount } = placeBidDto;

    const auction = await this.auctionModel.findById(auctionId);
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    // Check if auction is active
    if (auction.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException('Auction is not active');
    }

    // Check if auction has ended
    if (new Date() > auction.endDate) {
      throw new BadRequestException('Auction has ended');
    }

    // Check if bidder is not the seller
    if (auction.seller.toString() === bidderId) {
      throw new BadRequestException('Sellers cannot bid on their own auctions');
    }

    // Check minimum bid amount
    const minimumBid = auction.currentPrice + auction.minimumBidIncrement;
    if (bidAmount < minimumBid) {
      throw new BadRequestException(`Minimum bid is ${minimumBid} GEL`);
    }

    // Get bidder info
    const bidder = await this.userModel.findById(bidderId);
    if (!bidder) {
      throw new BadRequestException('Bidder not found');
    }

    // Create new bid
    const newBid: AuctionBid = {
      bidder: new Types.ObjectId(bidderId),
      amount: bidAmount,
      timestamp: new Date(),
      bidderName: `${bidder.ownerFirstName} ${bidder.ownerLastName}`,
    };

    // Update auction
    auction.bids.push(newBid);
    auction.currentPrice = bidAmount;
    auction.currentWinner = new Types.ObjectId(bidderId);
    auction.totalBids = auction.bids.length;

    await auction.save();

    this.logger.log(
      `New bid placed: ${bidAmount} GEL on auction ${auctionId} by ${bidder.ownerFirstName} ${bidder.ownerLastName}`,
    );

    // TODO: Send notifications to previous bidders

    return auction;
  }

  // Get seller's auctions
  async getSellerAuctions(
    sellerId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [auctions, total] = await Promise.all([
      this.auctionModel
        .find({ seller: sellerId })
        .populate('currentWinner', 'ownerFirstName ownerLastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.auctionModel.countDocuments({ seller: sellerId }),
    ]);

    return {
      auctions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    };
  }

  // Get user's bids
  async getUserBids(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const auctions = await this.auctionModel
      .find({
        'bids.bidder': userId,
      })
      .populate('seller', 'ownerFirstName ownerLastName')
      .sort({ 'bids.timestamp': -1 })
      .skip(skip)
      .limit(limit);

    // Filter and map user's bids with auction info
    const userBids = auctions.flatMap((auction) =>
      auction.bids
        .filter((bid) => bid.bidder.toString() === userId)
        .map((bid) => ({
          auction: {
            _id: auction._id,
            title: auction.title,
            mainImage: auction.mainImage,
            status: auction.status,
            endDate: auction.endDate,
            currentPrice: auction.currentPrice,
            isWinning: auction.currentWinner?.toString() === userId,
          },
          bid: {
            amount: bid.amount,
            timestamp: bid.timestamp,
          },
        })),
    );

    return userBids.slice(skip, skip + limit);
  }

  // Admin: Approve auction
  async approveAuction(
    auctionId: string,
    adminId: string,
  ): Promise<AuctionDocument> {
    const auction = await this.auctionModel.findById(auctionId);
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (auction.status !== AuctionStatus.PENDING) {
      throw new BadRequestException('Only pending auctions can be approved');
    }

    auction.isApproved = true;
    auction.approvedBy = new Types.ObjectId(adminId);
    auction.approvedAt = new Date();
    auction.rejectionReason = undefined;

    const now = new Date();
    if (auction.startDate <= now) {
      auction.status = AuctionStatus.ACTIVE;
      auction.activatedAt = now;
    } else {
      auction.status = AuctionStatus.SCHEDULED;
      auction.activatedAt = undefined;
    }

    await auction.save();

    this.logger.log(`Auction approved: ${auctionId} by admin: ${adminId}`);
    return auction;
  }

  // Admin: Cancel auction
  async cancelAuction(
    auctionId: string,
    adminId: string,
    reason?: string,
  ): Promise<AuctionDocument> {
    const auction = await this.auctionModel.findById(auctionId);
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (auction.status === AuctionStatus.CANCELLED) {
      throw new BadRequestException('Auction is already cancelled');
    }

    if (auction.status === AuctionStatus.ENDED && auction.isPaid) {
      throw new BadRequestException('Cannot cancel auctions that are paid');
    }

    auction.status = AuctionStatus.CANCELLED;
    auction.rejectionReason = reason || 'Cancelled by admin';
    auction.cancelledBy = new Types.ObjectId(adminId);
    auction.cancelledAt = new Date();
    auction.endedAt = new Date();
    auction.currentWinner = null;
    auction.paymentDeadline = null as any;
    auction.paymentDate = null as any;
    auction.isPaid = false;
    auction.commissionAmount = 0;
    auction.sellerEarnings = 0;

    await auction.save();

    this.logger.log(`Auction cancelled: ${auctionId} by admin: ${adminId}`);
    return auction;
  }

  async rescheduleAuction(
    auctionId: string,
    requesterId: string,
    payload: RescheduleAuctionDto,
    isAdmin: boolean,
  ) {
    const auction = await this.auctionModel.findById(auctionId);
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (!isAdmin && auction.seller.toString() !== requesterId) {
      throw new ForbiddenException('You cannot modify this auction');
    }

    if (!isAdmin && auction.totalBids > 0) {
      throw new BadRequestException(
        'Auctions with bids cannot be rescheduled. Please contact support.',
      );
    }

    const startDateTime = this.combineToDateTime(
      payload.startDate,
      payload.startTime,
    );
    const endDateTime = this.combineToDateTime(
      payload.endDate,
      payload.endTime,
    );
    this.validateSchedule(startDateTime, endDateTime);

    const { additionalImages = [] } = payload;

    auction.title = payload.title;
    auction.description = payload.description;
    auction.artworkType = payload.artworkType;
    auction.dimensions = payload.dimensions;
    auction.material = payload.material;
    auction.mainImage = payload.mainImage;
    auction.additionalImages = additionalImages;
    auction.startingPrice = payload.startingPrice;
    auction.minimumBidIncrement = payload.minimumBidIncrement;
    auction.deliveryDays = payload.deliveryDays;
    auction.deliveryInfo = payload.deliveryInfo;
    auction.startDate = startDateTime;
    auction.startTime = payload.startTime;
    auction.endDate = endDateTime;
    auction.endTime = payload.endTime;

    auction.currentPrice = payload.startingPrice;
    auction.currentWinner = null;
    auction.bids = [];
    auction.totalBids = 0;
    auction.paymentDeadline = null as any;
    auction.paymentDate = null as any;
    auction.isPaid = false;
    auction.commissionAmount = 0;
    auction.sellerEarnings = 0;
    auction.cancelledAt = undefined;
    auction.cancelledBy = undefined;
    auction.endedAt = undefined;
    auction.rejectionReason = undefined;

    const relistCount = auction.relistCount ?? 0;
    auction.relistCount = relistCount + 1;

    if (isAdmin) {
      const now = new Date();
      auction.isApproved = true;
      auction.approvedBy = new Types.ObjectId(requesterId);
      auction.approvedAt = now;

      if (startDateTime <= now) {
        auction.status = AuctionStatus.ACTIVE;
        auction.activatedAt = now;
      } else {
        auction.status = AuctionStatus.SCHEDULED;
        auction.activatedAt = undefined;
      }
    } else {
      auction.isApproved = false;
      auction.approvedBy = undefined;
      auction.approvedAt = undefined;
      auction.status = AuctionStatus.PENDING;
      auction.activatedAt = undefined;
    }

    await auction.save();

    this.logger.log(
      `Auction ${auctionId} rescheduled by ${isAdmin ? 'admin' : 'seller'} ${requesterId}`,
    );

    return auction;
  }

  async uploadAuctionImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/avif',
    ];

    const mimeType = file.mimetype?.toLowerCase() ?? '';

    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        'Unsupported image format. Use JPG, PNG, WEBP or AVIF.',
      );
    }

    const maxSizeBytes = 8 * 1024 * 1024; // 8MB
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('Image size exceeds 8MB limit');
    }

    try {
      // Optimize image with sharp - convert to WebP for better compression
      const optimizedBuffer = await sharp(file.buffer)
        .resize(1600, 1600, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();

      // Generate unique filename
      const uniqueId = randomUUID();
      const key = `auctions/${uniqueId}.webp`;

      // Upload to S3
      await this.awsS3Service.uploadImage(key, optimizedBuffer, {
        contentType: 'image/webp',
        acl: 'public-read',
      });

      const publicUrl = this.awsS3Service.getPublicUrl(key);

      this.logger.log(`Auction image uploaded to S3: ${key}`);

      return {
        url: publicUrl,
        key: key,
      };
    } catch (error) {
      this.logger.error(`Failed to upload auction image: ${error.message}`);
      throw new BadRequestException('Image upload failed');
    }
  }

  // Admin: Reject auction
  async rejectAuction(
    auctionId: string,
    reason: string,
    adminId: string,
  ): Promise<AuctionDocument> {
    const auction = await this.auctionModel.findById(auctionId);
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    auction.status = AuctionStatus.CANCELLED;
    auction.rejectionReason = reason;
    auction.endedAt = new Date();

    await auction.save();

    this.logger.log(
      `Auction rejected: ${auctionId} by admin: ${adminId}, reason: ${reason}`,
    );
    return auction;
  }

  // Cron job to end auctions
  @Cron(CronExpression.EVERY_MINUTE)
  async checkEndedAuctions() {
    const now = new Date();

    const endedAuctions = await this.auctionModel.find({
      status: AuctionStatus.ACTIVE,
      endDate: { $lte: now },
    });

    for (const auction of endedAuctions) {
      await this.endAuction(auction);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async activateScheduledAuctions() {
    const now = new Date();

    const scheduledAuctions = await this.auctionModel.find({
      status: AuctionStatus.SCHEDULED,
      startDate: { $lte: now },
    });

    for (const auction of scheduledAuctions) {
      if (auction.endDate <= now) {
        await this.endAuction(auction);
        continue;
      }
      auction.status = AuctionStatus.ACTIVE;
      auction.activatedAt = now;
      await auction.save();
      this.logger.log(`Scheduled auction activated: ${auction._id}`);
    }
  }

  // End auction and process results
  private async endAuction(auction: AuctionDocument) {
    auction.status = AuctionStatus.ENDED;
    auction.endedAt = new Date();

    if (auction.currentWinner && auction.bids.length > 0) {
      // Calculate payment deadline (2 working days)
      const paymentDeadline = this.calculatePaymentDeadline();
      auction.paymentDeadline = paymentDeadline;

      // Calculate commission and seller earnings
      const commissionAmount = auction.currentPrice * 0.1; // 10%
      auction.commissionAmount = commissionAmount;
      auction.sellerEarnings = auction.currentPrice - commissionAmount;

      await auction.save();

      // Send notifications
      await this.sendAuctionEndNotifications(auction);

      this.logger.log(
        `Auction ended: ${auction._id}, Winner: ${auction.currentWinner}, Final price: ${auction.currentPrice} GEL`,
      );
    } else {
      await auction.save();
      this.logger.log(`Auction ended without bids: ${auction._id}`);
    }
  }

  // Calculate payment deadline (2 working days, excluding weekends)
  private calculatePaymentDeadline(): Date {
    const deadline = new Date();
    let workingDays = 0;

    while (workingDays < 2) {
      deadline.setDate(deadline.getDate() + 1);
      const dayOfWeek = deadline.getDay();

      // Skip weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }

    // Set deadline to end of business day (18:00)
    deadline.setHours(18, 0, 0, 0);

    return deadline;
  }

  // Send notifications when auction ends
  private async sendAuctionEndNotifications(auction: AuctionDocument) {
    try {
      // Notify winner
      if (auction.currentWinner) {
        const winner = await this.userModel.findById(auction.currentWinner);
        if (winner) {
          await this.emailService.sendAuctionWinnerNotification(
            winner.email,
            auction.title,
            auction.currentPrice,
            auction.paymentDeadline,
          );
        }
      }

      // Notify seller
      const seller = await this.userModel.findById(auction.seller);
      if (seller) {
        await this.emailService.sendAuctionSellerNotification(
          seller.email,
          auction.title,
          auction.currentPrice,
          auction.sellerEarnings,
        );
      }
    } catch (error) {
      this.logger.error('Failed to send auction end notifications:', error);
    }
  }

  // Mark auction as paid
  async markAuctionAsPaid(
    auctionId: string,
    adminId: string,
  ): Promise<AuctionDocument> {
    const auction = await this.auctionModel.findById(auctionId);
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (auction.status !== AuctionStatus.ENDED) {
      throw new BadRequestException(
        'Only ended auctions can be marked as paid',
      );
    }

    if (auction.isPaid) {
      throw new BadRequestException('Auction is already marked as paid');
    }

    auction.isPaid = true;
    auction.paymentDate = new Date();

    await auction.save();

    // Process seller earnings
    if (auction.sellerEarnings > 0) {
      await this.balanceService.addAuctionEarnings(
        auction.seller.toString(),
        auction.sellerEarnings,
        auction._id.toString(),
        auction.title,
      );
    }

    this.logger.log(
      `Auction marked as paid: ${auctionId}, Seller earnings: ${auction.sellerEarnings} GEL`,
    );
    return auction;
  }

  // Get auction statistics
  async getAuctionStats() {
    const [
      totalAuctions,
      activeAuctions,
      endedAuctions,
      totalBids,
      totalValue,
    ] = await Promise.all([
      this.auctionModel.countDocuments(),
      this.auctionModel.countDocuments({ status: AuctionStatus.ACTIVE }),
      this.auctionModel.countDocuments({ status: AuctionStatus.ENDED }),
      this.auctionModel.aggregate([{ $unwind: '$bids' }, { $count: 'total' }]),
      this.auctionModel.aggregate([
        { $match: { status: AuctionStatus.ENDED, isPaid: true } },
        { $group: { _id: null, total: { $sum: '$currentPrice' } } },
      ]),
    ]);

    return {
      totalAuctions,
      activeAuctions,
      endedAuctions,
      totalBids: totalBids[0]?.total || 0,
      totalValue: totalValue[0]?.total || 0,
    };
  }
}
