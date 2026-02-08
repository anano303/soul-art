import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Auction,
  AuctionDocument,
  AuctionStatus,
  AuctionBid,
} from '../schemas/auction.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Order, OrderDocument } from '../../orders/schemas/order.schema';
import {
  CreateAuctionDto,
  PlaceBidDto,
  AuctionFilterDto,
  RescheduleAuctionDto,
  WinnerPaymentDto,
  DELIVERY_FEES,
} from '../dtos/auction.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BalanceService } from '../../users/services/balance.service';
import { EmailService } from '../../email/services/email.services';
import { AwsS3Service } from '../../aws-s3/aws-s3.service';
import { AuctionAdminService } from './auction-admin.service';
import { PushNotificationService } from '../../push/services/push-notification.service';
import { Role } from '../../types/role.enum';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import sharp from 'sharp';

@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);
  private readonly baseUrl: string;

  constructor(
    @InjectModel(Auction.name) private auctionModel: Model<Auction>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private balanceService: BalanceService,
    private emailService: EmailService,
    private readonly awsS3Service: AwsS3Service,
    @Inject(forwardRef(() => AuctionAdminService))
    private auctionAdminService: AuctionAdminService,
    private pushNotificationService: PushNotificationService,
    private moduleRef: ModuleRef,
  ) {
    this.baseUrl = process.env.FRONTEND_URL || 'https://soulart.ge';
  }

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
    if (
      !seller ||
      (seller.role !== Role.Seller &&
        seller.role !== Role.SellerAndSalesManager)
    ) {
      throw new BadRequestException(
        'Only verified sellers can have auctions created for them',
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
      dimensions,
      page = 1,
      limit = 12,
    } = filters;

    const query: any = {};

    const normalizedStatus = status?.toString().toUpperCase();

    if (!normalizedStatus) {
      query.status = AuctionStatus.ACTIVE;
    } else if (normalizedStatus === 'ALL') {
      // No status filter - get all
    } else if (normalizedStatus.includes(',')) {
      // Handle comma-separated status values like "ACTIVE,SCHEDULED"
      const statuses = normalizedStatus.split(',').map((s) => s.trim());
      const validStatuses = statuses.filter((s) =>
        Object.values(AuctionStatus).includes(s as AuctionStatus),
      );
      if (validStatuses.length === 0) {
        throw new BadRequestException('Invalid auction status filter');
      }
      query.status = { $in: validStatuses };
    } else {
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
    if (dimensions) query.dimensions = new RegExp(dimensions, 'i');

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

  // Get unique materials and dimensions from active auctions for filter dropdowns
  async getFilterOptions() {
    const activeAuctions = await this.auctionModel
      .find({ status: { $in: ['ACTIVE', 'SCHEDULED'] } })
      .select('material dimensions')
      .lean();

    const materialsSet = new Set<string>();
    const dimensionsSet = new Set<string>();

    activeAuctions.forEach((auction) => {
      if (auction.material && auction.material.trim()) {
        materialsSet.add(auction.material.trim());
      }
      if (auction.dimensions && auction.dimensions.trim()) {
        dimensionsSet.add(auction.dimensions.trim());
      }
    });

    return {
      materials: Array.from(materialsSet).sort(),
      dimensions: Array.from(dimensionsSet).sort(),
    };
  }

  // Get single auction with full details
  async getAuctionById(auctionId: string): Promise<AuctionDocument | null> {
    if (!Types.ObjectId.isValid(auctionId)) {
      throw new BadRequestException('Invalid auction ID');
    }

    const auction = await this.auctionModel
      .findById(auctionId)
      .populate(
        'seller',
        'name firstName lastName ownerFirstName ownerLastName storeName email phone',
      )
      .populate(
        'currentWinner',
        'name firstName lastName ownerFirstName ownerLastName',
      )
      .populate(
        'bids.bidder',
        'name firstName lastName ownerFirstName ownerLastName',
      );

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    return auction;
  }

  // Get lightweight bid status for polling (minimal data transfer)
  async getAuctionBidStatus(auctionId: string) {
    if (!Types.ObjectId.isValid(auctionId)) {
      throw new BadRequestException('Invalid auction ID');
    }

    const auction = await this.auctionModel
      .findById(auctionId)
      .select(
        'currentPrice endDate status totalBids currentWinner bids minimumBidIncrement',
      )
      .populate('currentWinner', 'ownerFirstName ownerLastName')
      .lean();

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    // Return only the last 5 bids for efficiency
    const recentBids = (auction.bids || [])
      .slice(-5)
      .reverse()
      .map((bid: any) => ({
        amount: bid.amount,
        timestamp: bid.timestamp,
        bidderName: bid.bidderName,
      }));

    return {
      currentPrice: auction.currentPrice,
      endDate: auction.endDate,
      status: auction.status,
      totalBids: auction.totalBids,
      minimumBidIncrement: auction.minimumBidIncrement,
      currentWinner: auction.currentWinner
        ? {
            name: `${(auction.currentWinner as any).ownerFirstName || ''} ${(auction.currentWinner as any).ownerLastName || ''}`.trim(),
          }
        : null,
      recentBids,
      serverTime: new Date(), // For client time sync
    };
  }

  // Long-polling: Wait for auction updates
  async getAuctionBidStatusLongPoll(
    auctionId: string,
    lastTotalBids?: number,
    lastEndDate?: string,
    timeoutMs = 30000,
  ) {
    const startTime = Date.now();
    const pollInterval = 200; // Check every 200ms

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getAuctionBidStatus(auctionId);

      // Check if there's an update
      const hasUpdate =
        (lastTotalBids !== undefined && status.totalBids !== lastTotalBids) ||
        (lastEndDate && status.endDate.toISOString() !== lastEndDate) ||
        status.status === 'ENDED';

      if (hasUpdate) {
        return { ...status, hasUpdate: true };
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // Timeout - return current state with no update flag
    const status = await this.getAuctionBidStatus(auctionId);
    return { ...status, hasUpdate: false };
  }

  // Place a bid
  async placeBid(bidderId: string, placeBidDto: PlaceBidDto) {
    const { auctionId, bidAmount } = placeBidDto;

    const auction = await this.auctionModel.findById(auctionId);
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    // Check if auction is active or scheduled (pre-bid)
    if (
      auction.status !== AuctionStatus.ACTIVE &&
      auction.status !== AuctionStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        'Auction is not active or scheduled for pre-bidding',
      );
    }

    // Check if auction has ended (only for active auctions)
    if (
      auction.status === AuctionStatus.ACTIVE &&
      new Date() > auction.endDate
    ) {
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

    // Bid extension logic: if bid placed in last 10 seconds, extend by 10 seconds
    const BID_EXTENSION_THRESHOLD_MS = 10000; // 10 seconds
    const BID_EXTENSION_AMOUNT_MS = 10000; // 10 seconds
    const now = new Date();
    const timeRemaining = auction.endDate.getTime() - now.getTime();
    let wasExtended = false;

    if (
      auction.status === AuctionStatus.ACTIVE &&
      timeRemaining > 0 &&
      timeRemaining <= BID_EXTENSION_THRESHOLD_MS
    ) {
      // Extend auction end time by 10 seconds
      auction.endDate = new Date(
        auction.endDate.getTime() + BID_EXTENSION_AMOUNT_MS,
      );
      wasExtended = true;
      this.logger.log(
        `Auction ${auctionId} extended by 10 seconds due to last-second bid. New end time: ${auction.endDate}`,
      );
    }

    // Update auction
    auction.bids.push(newBid);
    auction.currentPrice = bidAmount;
    auction.currentWinner = new Types.ObjectId(bidderId);
    auction.totalBids = auction.bids.length;

    await auction.save();

    this.logger.log(
      `New bid placed: ${bidAmount} GEL on auction ${auctionId} by ${bidder.ownerFirstName} ${bidder.ownerLastName}${wasExtended ? ' (time extended)' : ''}`,
    );

    // TODO: Send notifications to previous bidders

    // Return auction with extension info for frontend
    const auctionObj = auction.toObject();
    return {
      ...auctionObj,
      wasExtended,
      newEndDate: wasExtended ? auction.endDate : undefined,
    };
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

  // Get seller's auction earnings (paid auctions)
  async getSellerAuctionEarnings(
    sellerId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    // Get paid auctions for this seller
    const [paidAuctions, total] = await Promise.all([
      this.auctionModel
        .find({
          seller: sellerId,
          status: 'ENDED',
          isPaid: true,
        })
        .populate('currentWinner', 'name ownerFirstName ownerLastName email')
        .select(
          'title mainImage currentPrice sellerEarnings commissionAmount deliveryZone deliveryFee totalPayment paymentDate endedAt',
        )
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.auctionModel.countDocuments({
        seller: sellerId,
        status: 'ENDED',
        isPaid: true,
      }),
    ]);

    // Calculate totals
    const allPaidAuctions = await this.auctionModel
      .find({
        seller: sellerId,
        status: 'ENDED',
        isPaid: true,
      })
      .select('sellerEarnings commissionAmount currentPrice')
      .lean();

    const totalEarnings = allPaidAuctions.reduce(
      (sum, a) => sum + (a.sellerEarnings || 0),
      0,
    );
    const totalSales = allPaidAuctions.reduce(
      (sum, a) => sum + (a.currentPrice || 0),
      0,
    );
    const totalCommission = allPaidAuctions.reduce(
      (sum, a) => sum + (a.commissionAmount || 0),
      0,
    );

    return {
      auctions: paidAuctions,
      summary: {
        totalAuctionsSold: total,
        totalSales,
        totalCommission,
        totalEarnings,
      },
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

    // Send push notification to all users about new auction
    await this.sendNewAuctionPushNotification(auction);

    this.logger.log(`Auction approved: ${auctionId} by admin: ${adminId}`);
    return auction;
  }

  // Send push notification when new auction is approved
  private async sendNewAuctionPushNotification(auction: AuctionDocument) {
    try {
      // Get seller name
      const seller = await this.userModel.findById(auction.seller);
      const sellerName = seller
        ? seller.storeName ||
          `${seller.ownerFirstName || ''} ${seller.ownerLastName || ''}`.trim() ||
          seller.name ||
          'უცნობი მხატვარი'
        : 'უცნობი მხატვარი';

      // Format dates
      const startDateStr = auction.startDate.toLocaleDateString('ka-GE', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      const endDateStr = auction.endDate.toLocaleDateString('ka-GE', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      const payload = {
        title: '🔨 ახალი აუქციონი SoulArt-ზე!',
        body: `${auction.title}\n💰 საწყისი ფასი: ${auction.startingPrice} ₾\n🎨 ${sellerName}\n📅 ${startDateStr} - ${endDateStr}`,
        icon: auction.mainImage || `${this.baseUrl}/android-icon-192x192.png`,
        badge: `${this.baseUrl}/notification-badge.png`,
        data: {
          type: 'new_auction' as const,
          url: `/auctions/${auction._id}`,
          id: auction._id.toString(),
        },
        tag: `new-auction-${auction._id}`,
        requireInteraction: true,
      };

      // Send to all users (not admins-only notification)
      const results = await this.pushNotificationService.sendToAll(payload);
      this.logger.log(
        `New auction push sent: ${results.successful} success, ${results.failed} failed`,
      );
    } catch (error) {
      this.logger.error(`Failed to send new auction push: ${error}`);
    }
  }

  // Admin: Cancel auction
  async cancelAuction(
    auctionId: string,
    adminId: string,
    reason?: string,
    isAdmin: boolean = true,
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

    // Auction admin restrictions: can only cancel PENDING or SCHEDULED auctions with no bids
    if (!isAdmin) {
      const canAuctionAdminCancel =
        (auction.status === AuctionStatus.PENDING ||
          auction.status === AuctionStatus.SCHEDULED) &&
        auction.totalBids === 0;

      if (!canAuctionAdminCancel) {
        throw new ForbiddenException(
          'აუქციონ ადმინს მხოლოდ მოლოდინში ან დაგეგმილი აუქციონების გაუქმება შეუძლია, რომლებსაც ბიდები არ აქვს',
        );
      }
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
      throw new ForbiddenException(
        'თქვენ არ გაქვთ ამ აუქციონის რედაქტირების უფლება',
      );
    }

    if (!isAdmin && auction.totalBids > 0) {
      throw new BadRequestException(
        'რედაქტირება შეუძლებელია: აუქციონს უკვე აქვს ბიდები',
      );
    }

    // Check auction status for non-admin users
    if (
      !isAdmin &&
      (auction.status === 'ACTIVE' || auction.status === 'ENDED')
    ) {
      throw new BadRequestException(
        auction.status === 'ACTIVE'
          ? 'რედაქტირება შეუძლებელია: აუქციონი აქტიურია'
          : 'რედაქტირება შეუძლებელია: აუქციონი დასრულებულია',
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
    auction.deliveryType = payload.deliveryType || 'SOULART';
    auction.deliveryDaysMin = payload.deliveryDaysMin;
    auction.deliveryDaysMax = payload.deliveryDaysMax;
    auction.deliveryInfo = payload.deliveryInfo || '';
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
    // Note: AVIF/HEIF removed due to sharp compatibility issues on some systems
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    const mimeType = file.mimetype?.toLowerCase() ?? '';

    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        'Unsupported image format. Use JPG, PNG, or WEBP.',
      );
    }

    const maxSizeBytes = 8 * 1024 * 1024; // 8MB
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('Image size exceeds 8MB limit');
    }

    try {
      // Optimize image with sharp - convert to WebP for better compression
      const optimizedBuffer = await sharp(file.buffer, { failOn: 'none' })
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
      });

      // Get public URL (bucket has public access enabled)
      const publicUrl = this.awsS3Service.getPublicUrl(key);

      this.logger.log(`Auction image uploaded to S3: ${key}`);

      return {
        url: publicUrl,
        key: key,
      };
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error';
      const errorCode = error?.Code || error?.name || '';
      this.logger.error(
        `Failed to upload auction image: ${errorCode} - ${errorMessage}`,
      );

      // Provide more specific error messages
      if (
        errorCode === 'AccessDenied' ||
        errorMessage.includes('Access Denied')
      ) {
        throw new BadRequestException(
          'S3 access denied. Please check bucket permissions.',
        );
      }

      throw new BadRequestException(`Image upload failed: ${errorMessage}`);
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

  // Check payment deadlines and transfer to next bidder if not paid
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkPaymentDeadlines() {
    const now = new Date();

    // Find ended auctions where payment deadline passed and not paid
    const unpaidAuctions = await this.auctionModel.find({
      status: AuctionStatus.ENDED,
      isPaid: false,
      paymentDeadline: { $lte: now },
      currentWinner: { $exists: true, $ne: null },
    });

    for (const auction of unpaidAuctions) {
      await this.transferToNextBidder(auction);
    }
  }

  // Transfer auction to next bidder when winner doesn't pay
  private async transferToNextBidder(auction: AuctionDocument) {
    const bids = auction.bids || [];

    if (bids.length <= 1) {
      // No other bidders - send notifications about auction failure
      this.logger.log(
        `No other bidders for auction ${auction._id}, needs manual relist`,
      );
      // Reset winner and keep as ended - admin can reschedule
      auction.currentWinner = undefined;
      auction.currentPrice = auction.startingPrice;
      await auction.save();

      // Notify all parties about auction failure
      await this.sendAuctionFailureNotifications(auction, 'all_defaulted');
      return;
    }

    // Find the previous bidder (second highest bid)
    // Bids are stored with newest first, so we need the second unique bidder
    const currentWinnerId = auction.currentWinner?.toString();
    let nextBid: AuctionBid | undefined;

    for (const bid of bids) {
      if (bid.bidder.toString() !== currentWinnerId) {
        nextBid = bid;
        break;
      }
    }

    if (!nextBid) {
      this.logger.log(`No valid next bidder found for auction ${auction._id}`);
      auction.currentWinner = undefined;
      auction.currentPrice = auction.startingPrice;
      await auction.save();

      // Notify all parties about auction failure
      await this.sendAuctionFailureNotifications(auction, 'all_defaulted');
      return;
    }

    // Transfer to next bidder
    const previousWinnerId = auction.currentWinner;
    auction.currentWinner = nextBid.bidder;
    auction.currentPrice = nextBid.amount;

    // Recalculate commission and earnings with new system
    const settings = await this.auctionAdminService.getSettings();
    const totalCommissionPercent =
      settings.auctionAdminCommissionPercent +
      settings.platformCommissionPercent;
    const sellerPercent = 100 - totalCommissionPercent;

    const commissionAmount =
      (auction.currentPrice * totalCommissionPercent) / 100;
    auction.commissionAmount = commissionAmount;
    auction.sellerEarnings = (auction.currentPrice * sellerPercent) / 100;

    // Set new payment deadline
    auction.paymentDeadline = this.calculatePaymentDeadline();

    // Remove the defaulted bidder's bids
    auction.bids = bids.filter(
      (bid) => bid.bidder.toString() !== currentWinnerId,
    );
    auction.totalBids = auction.bids.length;

    await auction.save();

    // Notify new winner
    const newWinner = await this.userModel.findById(nextBid.bidder);
    if (newWinner) {
      try {
        await this.emailService.sendAuctionWinnerNotification(
          newWinner.email,
          auction.title,
          auction.currentPrice,
          auction.paymentDeadline,
          auction.mainImage,
          auction.deliveryType,
        );
      } catch (error) {
        this.logger.error(`Failed to notify new winner: ${error}`);
      }
    }

    // Get previous winner info for notifications
    const previousWinner = await this.userModel.findById(previousWinnerId);
    const previousWinnerName = previousWinner?.name || 'უცნობი';

    // Get settings for commission calculation
    const transferSettings = await this.auctionAdminService.getSettings();
    const auctionAdminCommissionPercent =
      transferSettings.auctionAdminCommissionPercent || 30;
    const adminCommission =
      (auction.currentPrice * auctionAdminCommissionPercent) / 100;

    // Notify seller about transfer (previous winner defaulted)
    const seller = await this.userModel.findById(auction.seller);
    if (seller) {
      try {
        await this.emailService.sendAuctionTransferNotification(
          seller.email,
          auction.title,
          previousWinnerName,
          newWinner?.name || 'ახალი მყიდველი',
          auction.currentPrice,
          auction.sellerEarnings,
          auction.paymentDeadline,
          'seller',
          auction.mainImage,
        );
      } catch (error) {
        this.logger.error(`Failed to notify seller about transfer: ${error}`);
      }
    }

    // Notify auction admin about transfer
    try {
      if (transferSettings.auctionAdminUserId) {
        const auctionAdmin = await this.userModel.findById(
          transferSettings.auctionAdminUserId,
        );
        if (auctionAdmin) {
          await this.emailService.sendAuctionTransferNotification(
            auctionAdmin.email,
            auction.title,
            previousWinnerName,
            newWinner?.name || 'ახალი მყიდველი',
            auction.currentPrice,
            auction.sellerEarnings,
            auction.paymentDeadline,
            'auctionAdmin',
            auction.mainImage,
            adminCommission,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify auction admin about transfer: ${error}`,
      );
    }

    // Notify main admin about transfer
    try {
      const mainAdminEmail =
        process.env.ADMIN_EMAIL || 'soulartgeorgia@gmail.com';
      await this.emailService.sendAuctionTransferNotification(
        mainAdminEmail,
        auction.title,
        previousWinnerName,
        newWinner?.name || 'ახალი მყიდველი',
        auction.currentPrice,
        auction.sellerEarnings,
        auction.paymentDeadline,
        'mainAdmin',
        auction.mainImage,
      );
    } catch (error) {
      this.logger.error(`Failed to notify main admin about transfer: ${error}`);
    }

    // === PUSH NOTIFICATIONS for transfer ===
    // Push to new winner
    if (newWinner) {
      const newWinnerPayload = {
        title: '🎉 აუქციონი მოიგეთ!',
        body: `"${auction.title}"\n💰 ფასი: ${auction.currentPrice} ₾\n⏰ გადახდის ვადა: 24 საათი`,
        icon: auction.mainImage || `${this.baseUrl}/android-icon-192x192.png`,
        badge: `${this.baseUrl}/notification-badge.png`,
        data: {
          type: 'auction_won' as const,
          url: `/auctions/${auction._id}`,
          id: auction._id.toString(),
        },
        tag: `auction-won-${auction._id}`,
        requireInteraction: true,
      };
      await this.pushNotificationService.sendToUser(
        nextBid.bidder.toString(),
        newWinnerPayload,
      );
    }

    // Push to seller (only their new earnings info)
    if (seller) {
      const sellerPayload = {
        title: '🔄 აუქციონის მოგებული შეიცვალა',
        body: `"${auction.title}"\n💰 ახალი შემოსავალი: ${auction.sellerEarnings} ₾\n⏰ ახალი ვადა: 24სთ`,
        icon: auction.mainImage || `${this.baseUrl}/android-icon-192x192.png`,
        badge: `${this.baseUrl}/notification-badge.png`,
        data: {
          type: 'auction_transferred' as const,
          url: `/profile/balance`,
          id: auction._id.toString(),
        },
        tag: `auction-transfer-seller-${auction._id}`,
        requireInteraction: true,
      };
      await this.pushNotificationService.sendToUser(
        auction.seller.toString(),
        sellerPayload,
      );
    }

    // Push to auction admin (only their new commission)
    if (transferSettings.auctionAdminUserId) {
      const auctionAdminPayload = {
        title: '🔄 აუქციონის მოგებული შეიცვალა',
        body: `"${auction.title}"\n💰 ახალი საკომისიო: ${adminCommission} ₾`,
        icon: auction.mainImage || `${this.baseUrl}/android-icon-192x192.png`,
        badge: `${this.baseUrl}/notification-badge.png`,
        data: {
          type: 'auction_transferred' as const,
          url: `/auction-admin`,
          id: auction._id.toString(),
        },
        tag: `auction-transfer-admin-${auction._id}`,
        requireInteraction: true,
      };
      await this.pushNotificationService.sendToUser(
        transferSettings.auctionAdminUserId.toString(),
        auctionAdminPayload,
      );
    }

    // Push to main admin (full info)
    const mainAdminTransferPayload = {
      title: '🔄 აუქციონი გადაეცა ახალ მოგებულს',
      body: `"${auction.title}"\n❌ ${previousWinnerName} არ გადაიხადა\n✅ ახალი მოგებული: ${newWinner?.name || 'უცნობი'}`,
      icon: auction.mainImage || `${this.baseUrl}/android-icon-192x192.png`,
      badge: `${this.baseUrl}/notification-badge.png`,
      data: {
        type: 'auction_transferred' as const,
        url: `/admin/auctions`,
        id: auction._id.toString(),
      },
      tag: `auction-transfer-main-${auction._id}`,
      requireInteraction: true,
    };
    await this.pushNotificationService.sendToAdmins(mainAdminTransferPayload);

    this.logger.log(
      `Auction ${auction._id} transferred from ${previousWinnerId} to ${nextBid.bidder}, new price: ${auction.currentPrice} GEL`,
    );
  }

  // End auction and process results
  private async endAuction(auction: AuctionDocument) {
    auction.status = AuctionStatus.ENDED;
    auction.endedAt = new Date();

    if (auction.currentWinner && auction.bids.length > 0) {
      // Calculate payment deadline (24 hours)
      const paymentDeadline = this.calculatePaymentDeadline();
      auction.paymentDeadline = paymentDeadline;

      // Get commission settings
      const settings = await this.auctionAdminService.getSettings();

      // NEW COMMISSION STRUCTURE:
      // Auction Admin: auctionAdminCommissionPercent% (default 30%)
      // Platform: platformCommissionPercent% (default 10%)
      // Seller: remaining % (default 60%)
      const totalCommissionPercent =
        settings.auctionAdminCommissionPercent +
        settings.platformCommissionPercent;
      const sellerPercent = 100 - totalCommissionPercent;

      // Calculate amounts
      const commissionAmount =
        (auction.currentPrice * totalCommissionPercent) / 100;
      auction.commissionAmount = commissionAmount;
      auction.sellerEarnings = (auction.currentPrice * sellerPercent) / 100;

      await auction.save();

      // Send notifications
      await this.sendAuctionEndNotifications(auction);

      this.logger.log(
        `Auction ended: ${auction._id}, Winner: ${auction.currentWinner}, Final price: ${auction.currentPrice} GEL, Seller earnings: ${auction.sellerEarnings} GEL`,
      );
    } else {
      await auction.save();
      // Notify about auction with no bids
      await this.sendAuctionFailureNotifications(auction, 'no_bids');
      this.logger.log(`Auction ended without bids: ${auction._id}`);
    }
  }

  // Send notifications when auction fails (no bids or all defaulted)
  private async sendAuctionFailureNotifications(
    auction: AuctionDocument,
    reason: 'no_bids' | 'all_defaulted',
  ) {
    try {
      // Notify seller
      const seller = await this.userModel.findById(auction.seller);
      if (seller) {
        await this.emailService.sendAuctionNoWinnerNotification(
          seller.email,
          auction.title,
          reason,
          'seller',
          auction.mainImage,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify seller about auction failure: ${error}`,
      );
    }

    // Notify auction admin
    try {
      const settings = await this.auctionAdminService.getSettings();
      if (settings.auctionAdminUserId) {
        const auctionAdmin = await this.userModel.findById(
          settings.auctionAdminUserId,
        );
        if (auctionAdmin) {
          await this.emailService.sendAuctionNoWinnerNotification(
            auctionAdmin.email,
            auction.title,
            reason,
            'auctionAdmin',
            auction.mainImage,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify auction admin about failure: ${error}`,
      );
    }

    // Notify main admin
    try {
      const mainAdminEmail =
        process.env.ADMIN_EMAIL || 'soulartgeorgia@gmail.com';
      await this.emailService.sendAuctionNoWinnerNotification(
        mainAdminEmail,
        auction.title,
        reason,
        'mainAdmin',
        auction.mainImage,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify main admin about auction failure: ${error}`,
      );
    }

    // === PUSH NOTIFICATIONS for auction failure ===
    const reasonText =
      reason === 'no_bids'
        ? 'აუქციონზე არავინ მიიღო მონაწილეობა'
        : 'ყველა მოგებულმა გადაუხდელობით დატოვა';

    // Push to seller
    const seller = await this.userModel.findById(auction.seller);
    if (seller) {
      const sellerPayload = {
        title: '❌ აუქციონი დასრულდა უშედეგოდ',
        body: `"${auction.title}"\n${reasonText}`,
        icon: auction.mainImage || `${this.baseUrl}/android-icon-192x192.png`,
        badge: `${this.baseUrl}/notification-badge.png`,
        data: {
          type: 'auction_no_winner' as const,
          url: `/profile`,
          id: auction._id.toString(),
        },
        tag: `auction-no-winner-${auction._id}`,
        requireInteraction: true,
      };
      await this.pushNotificationService.sendToUser(
        auction.seller.toString(),
        sellerPayload,
      );
    }

    // Push to auction admin
    try {
      const pushSettings = await this.auctionAdminService.getSettings();
      if (pushSettings.auctionAdminUserId) {
        const auctionAdminPayload = {
          title: '❌ აუქციონი დასრულდა უშედეგოდ',
          body: `"${auction.title}"\n${reasonText}`,
          icon: auction.mainImage || `${this.baseUrl}/android-icon-192x192.png`,
          badge: `${this.baseUrl}/notification-badge.png`,
          data: {
            type: 'auction_no_winner' as const,
            url: `/auction-admin`,
            id: auction._id.toString(),
          },
          tag: `auction-no-winner-admin-${auction._id}`,
          requireInteraction: true,
        };
        await this.pushNotificationService.sendToUser(
          pushSettings.auctionAdminUserId.toString(),
          auctionAdminPayload,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to push notify auction admin: ${error}`);
    }

    // Push to main admin
    const mainAdminPayload = {
      title: '❌ აუქციონი დასრულდა უშედეგოდ',
      body: `"${auction.title}"\n${reasonText}`,
      icon: auction.mainImage || `${this.baseUrl}/android-icon-192x192.png`,
      badge: `${this.baseUrl}/notification-badge.png`,
      data: {
        type: 'auction_no_winner' as const,
        url: `/admin/auctions`,
        id: auction._id.toString(),
      },
      tag: `auction-no-winner-main-${auction._id}`,
      requireInteraction: true,
    };
    await this.pushNotificationService.sendToAdmins(mainAdminPayload);
  }

  // Calculate payment deadline (24 hours from now)
  private calculatePaymentDeadline(): Date {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 24);
    return deadline;
  }

  // Send notifications when auction ends
  private async sendAuctionEndNotifications(auction: AuctionDocument) {
    try {
      // Get seller info
      const seller = await this.userModel.findById(auction.seller);
      const sellerName = seller
        ? seller.storeName ||
          `${seller.ownerFirstName || ''} ${seller.ownerLastName || ''}`.trim() ||
          seller.name ||
          'უცნობი'
        : 'უცნობი';

      // Get winner info
      let winnerName = 'უცნობი';
      if (auction.currentWinner) {
        const winner = await this.userModel.findById(auction.currentWinner);
        if (winner) {
          winnerName =
            `${winner.ownerFirstName || ''} ${winner.ownerLastName || ''}`.trim() ||
            winner.name ||
            'უცნობი';

          // Notify winner
          await this.emailService.sendAuctionWinnerNotification(
            winner.email,
            auction.title,
            auction.currentPrice,
            auction.paymentDeadline,
            auction.mainImage,
            auction.deliveryType, // SOULART or ARTIST
          );
        }
      }

      // Notify seller
      if (seller) {
        await this.emailService.sendAuctionSellerNotification(
          seller.email,
          auction.title,
          auction.currentPrice,
          auction.sellerEarnings,
          auction.mainImage,
          auction.deliveryType, // SOULART or ARTIST
        );
      }

      // Get settings for commission calculation
      const settings = await this.auctionAdminService.getSettings();
      const auctionAdminCommissionPercent =
        settings.auctionAdminCommissionPercent || 30;
      const platformCommissionPercent =
        settings.platformCommissionPercent || 10;

      const auctionAdminCommission =
        (auction.currentPrice * auctionAdminCommissionPercent) / 100;
      const platformCommission =
        (auction.currentPrice * platformCommissionPercent) / 100;

      // Notify auction admin (only their commission)
      if (settings.auctionAdminUserId) {
        const auctionAdmin = await this.userModel.findById(
          settings.auctionAdminUserId,
        );
        if (auctionAdmin) {
          await this.emailService.sendAuctionAdminNotification(
            auctionAdmin.email,
            auction.title,
            auction.currentPrice,
            auctionAdminCommission,
            auction.mainImage,
          );
        }
      }

      // Notify main admin (full info including delivery fee if SOULART)
      const mainAdminEmail =
        process.env.ADMIN_EMAIL || 'soulartgeorgia@gmail.com';
      await this.emailService.sendMainAdminAuctionNotification(
        mainAdminEmail,
        auction.title,
        auction.currentPrice,
        auction.sellerEarnings,
        auctionAdminCommission,
        platformCommission,
        auction.deliveryFee || 0,
        auction.deliveryType,
        auction.mainImage,
        sellerName,
        winnerName,
      );

      // === PUSH NOTIFICATIONS ===
      // 1. Push to winner (only their info)
      if (auction.currentWinner) {
        const winnerPayload = {
          title: '🎉 აუქციონი მოიგეთ!',
          body: `"${auction.title}"\n💰 ფასი: ${auction.currentPrice} ₾\n⏰ გადახდის ვადა: 24 საათი`,
          icon: auction.mainImage || `${this.baseUrl}/android-icon-192x192.png`,
          badge: `${this.baseUrl}/notification-badge.png`,
          data: {
            type: 'auction_won' as const,
            url: `/auctions/${auction._id}`,
            id: auction._id.toString(),
          },
          tag: `auction-won-${auction._id}`,
          requireInteraction: true,
        };
        await this.pushNotificationService.sendToUser(
          auction.currentWinner.toString(),
          winnerPayload,
        );
      }

      // 2. Push to seller (only their info)
      if (seller) {
        const sellerPayload = {
          title: '🎨 თქვენი აუქციონი გაიყიდა!',
          body: `"${auction.title}"\n💰 თქვენი შემოსავალი: ${auction.sellerEarnings} ₾`,
          icon: auction.mainImage || `${this.baseUrl}/android-icon-192x192.png`,
          badge: `${this.baseUrl}/notification-badge.png`,
          data: {
            type: 'auction_sold' as const,
            url: `/profile/balance`,
            id: auction._id.toString(),
          },
          tag: `auction-sold-${auction._id}`,
          requireInteraction: true,
        };
        await this.pushNotificationService.sendToUser(
          auction.seller.toString(),
          sellerPayload,
        );
      }

      // 3. Push to auction admin (only their commission)
      if (settings.auctionAdminUserId) {
        const auctionAdminPayload = {
          title: '🔨 აუქციონი დასრულდა',
          body: `"${auction.title}"\n💰 თქვენი საკომისიო: ${auctionAdminCommission} ₾`,
          icon: auction.mainImage || `${this.baseUrl}/android-icon-192x192.png`,
          badge: `${this.baseUrl}/notification-badge.png`,
          data: {
            type: 'auction_ended' as const,
            url: `/auction-admin`,
            id: auction._id.toString(),
          },
          tag: `auction-ended-admin-${auction._id}`,
          requireInteraction: true,
        };
        await this.pushNotificationService.sendToUser(
          settings.auctionAdminUserId.toString(),
          auctionAdminPayload,
        );
      }

      // 4. Push to main admin (full info)
      const mainAdminPayload = {
        title: '📊 აუქციონი დასრულდა - სრული ინფო',
        body: `"${auction.title}"\n💰 ფასი: ${auction.currentPrice} ₾\n🎨 გამყიდველი: ${sellerName}\n🏆 მყიდველი: ${winnerName}`,
        icon: auction.mainImage || `${this.baseUrl}/android-icon-192x192.png`,
        badge: `${this.baseUrl}/notification-badge.png`,
        data: {
          type: 'auction_ended' as const,
          url: `/admin/auctions`,
          id: auction._id.toString(),
        },
        tag: `auction-ended-main-${auction._id}`,
        requireInteraction: true,
      };
      await this.pushNotificationService.sendToAdmins(mainAdminPayload);
    } catch (error) {
      this.logger.error('Failed to send auction end notifications:', error);
    }
  }

  // გადახდის დადასტურების მეილების გაგზავნა
  private async sendPaymentConfirmationNotifications(
    auction: AuctionDocument,
    seller: any,
    winner: any,
    deliveryFee: number,
    totalPayment: number,
  ) {
    try {
      // შევქმნათ მისამართის სტრინგი
      const shippingAddress = auction.shippingAddress
        ? [
            auction.shippingAddress.address,
            auction.shippingAddress.city,
            auction.shippingAddress.postalCode,
            auction.shippingAddress.country,
          ]
            .filter(Boolean)
            .join(', ')
        : '';

      const buyerName = winner
        ? `${winner.firstName || ''} ${winner.lastName || ''}`.trim() ||
          winner.name ||
          'უცნობი'
        : 'უცნობი';

      // 1. მყიდველს გადახდის დადასტურება
      if (winner?.email) {
        await this.emailService.sendAuctionPaymentConfirmationToBuyer(
          winner.email,
          auction.title,
          auction.currentPrice,
          deliveryFee,
          totalPayment,
          auction.deliveryType,
          auction.mainImage,
        );
      }

      // 2. გამყიდველს გადახდის დადასტურება
      if (seller?.email) {
        await this.emailService.sendAuctionPaymentConfirmationToSeller(
          seller.email,
          auction.title,
          auction.sellerEarnings,
          auction.deliveryType,
          buyerName,
          shippingAddress,
          auction.mainImage,
        );
      }

      // 3. აუქციონის ადმინს გადახდის დადასტურება
      const settings = await this.auctionAdminService.getSettings();
      if (settings.auctionAdminUserId) {
        const auctionAdmin = await this.userModel.findById(
          settings.auctionAdminUserId,
        );
        if (auctionAdmin?.email) {
          const auctionAdminCommissionPercent =
            settings.auctionAdminCommissionPercent || 30;
          const adminCommission =
            (auction.currentPrice * auctionAdminCommissionPercent) / 100;

          await this.emailService.sendAuctionPaymentConfirmationToAdmin(
            auctionAdmin.email,
            auction.title,
            adminCommission,
            auction.mainImage,
          );

          // Push to auction admin
          const auctionAdminPayload = {
            title: '💳 აუქციონის გადახდა მიღებულია',
            body: `"${auction.title}"\n💰 თქვენი საკომისიო: ${adminCommission} ₾`,
            icon:
              auction.mainImage || `${this.baseUrl}/android-icon-192x192.png`,
            badge: `${this.baseUrl}/notification-badge.png`,
            data: {
              type: 'auction_payment_received' as const,
              url: `/auction-admin`,
              id: auction._id.toString(),
            },
            tag: `auction-payment-admin-${auction._id}`,
            requireInteraction: true,
          };
          await this.pushNotificationService.sendToUser(
            settings.auctionAdminUserId.toString(),
            auctionAdminPayload,
          );
        }
      }

      // Push to seller about payment
      if (seller) {
        const sellerPayload = {
          title: '💳 გადახდა მიღებულია',
          body: `"${auction.title}"\n💰 თქვენი შემოსავალი: ${auction.sellerEarnings} ₾\n${auction.deliveryType === 'ARTIST' ? '📦 მიტანა თქვენს მოვალეობაა' : ''}`,
          icon: auction.mainImage || `${this.baseUrl}/android-icon-192x192.png`,
          badge: `${this.baseUrl}/notification-badge.png`,
          data: {
            type: 'auction_payment_received' as const,
            url: `/profile/balance`,
            id: auction._id.toString(),
          },
          tag: `auction-payment-seller-${auction._id}`,
          requireInteraction: true,
        };
        await this.pushNotificationService.sendToUser(
          auction.seller.toString(),
          sellerPayload,
        );
      }

      // Push to winner confirmation
      if (winner) {
        const winnerPayload = {
          title: '✅ გადახდა წარმატებულია',
          body: `"${auction.title}"\n💰 გადახდილია: ${totalPayment} ₾`,
          icon: auction.mainImage || `${this.baseUrl}/android-icon-192x192.png`,
          badge: `${this.baseUrl}/notification-badge.png`,
          data: {
            type: 'auction_payment_received' as const,
            url: `/auctions/${auction._id}`,
            id: auction._id.toString(),
          },
          tag: `auction-payment-buyer-${auction._id}`,
          requireInteraction: true,
        };
        await this.pushNotificationService.sendToUser(
          auction.currentWinner.toString(),
          winnerPayload,
        );
      }

      this.logger.log(
        `Payment confirmation emails sent for auction: ${auction._id}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to send payment confirmation notifications:',
        error,
      );
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

  // Get winner's won auctions (pending payment)
  async getWonAuctions(userId: string) {
    return this.auctionModel
      .find({
        status: AuctionStatus.ENDED,
        currentWinner: new Types.ObjectId(userId),
        isPaid: false,
      })
      .populate('seller', 'name ownerFirstName ownerLastName storeName')
      .sort({ endedAt: -1 })
      .exec();
  }

  // Get all won auctions for a user (both paid and unpaid)
  async getAllWonAuctions(userId: string) {
    return this.auctionModel
      .find({
        status: AuctionStatus.ENDED,
        currentWinner: new Types.ObjectId(userId),
      })
      .populate('seller', 'name ownerFirstName ownerLastName storeName')
      .sort({ endedAt: -1 })
      .exec();
  }

  // Get payment details for winner
  async getPaymentDetails(auctionId: string, userId: string) {
    const auction = await this.auctionModel.findById(auctionId);
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (auction.currentWinner?.toString() !== userId) {
      throw new ForbiddenException('You are not the winner of this auction');
    }

    if (auction.status !== AuctionStatus.ENDED) {
      throw new BadRequestException('Auction has not ended yet');
    }

    if (auction.isPaid) {
      throw new BadRequestException('Auction is already paid');
    }

    // Calculate delivery fee based on deliveryType
    let deliveryFee = 0;
    if (auction.deliveryType === 'SOULART') {
      // SoulArt delivery: 5% of price, min 15₾, max 50₾
      const fivePercent = auction.currentPrice * 0.05;
      deliveryFee = Math.max(15, Math.min(50, fivePercent));
      deliveryFee = Math.round(deliveryFee * 100) / 100;
    }
    // ARTIST delivery: free for buyer (0₾)

    return {
      auctionId: auction._id,
      title: auction.title,
      mainImage: auction.mainImage,
      winningBid: auction.currentPrice,
      deliveryType: auction.deliveryType,
      deliveryFee,
      totalPayment: auction.currentPrice + deliveryFee,
      paymentDeadline: auction.paymentDeadline,
      timeRemaining: auction.paymentDeadline
        ? Math.max(0, auction.paymentDeadline.getTime() - Date.now())
        : 0,
    };
  }

  // Winner confirms payment with delivery zone
  async confirmWinnerPayment(
    auctionId: string,
    userId: string,
    paymentDto: WinnerPaymentDto,
  ) {
    const auction = await this.auctionModel.findById(auctionId);
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (auction.currentWinner?.toString() !== userId) {
      throw new ForbiddenException('You are not the winner of this auction');
    }

    if (auction.status !== AuctionStatus.ENDED) {
      throw new BadRequestException('Auction has not ended yet');
    }

    if (auction.isPaid) {
      throw new BadRequestException('Auction is already paid');
    }

    // Calculate delivery fee based on deliveryType
    let deliveryFee = 0;
    if (auction.deliveryType === 'SOULART') {
      // SoulArt delivery: 5% of price, min 15₾, max 50₾
      const fivePercent = auction.currentPrice * 0.05;
      deliveryFee = Math.max(15, Math.min(50, fivePercent));
      deliveryFee = Math.round(deliveryFee * 100) / 100; // Round to 2 decimals
    }
    // ARTIST delivery: free for buyer (0₾)

    const totalPayment = auction.currentPrice + deliveryFee;

    // Update auction with payment info
    auction.winnerDeliveryZone = paymentDto.deliveryZone;
    auction.deliveryFee = deliveryFee;
    auction.totalPayment = totalPayment;
    auction.isPaid = true;
    auction.paymentDate = new Date();

    await auction.save();

    // Process seller earnings (only artwork price, not delivery)
    if (auction.sellerEarnings > 0) {
      await this.balanceService.addAuctionEarnings(
        auction.seller.toString(),
        auction.sellerEarnings,
        auction._id.toString(),
        auction.title,
      );
    }

    // Record auction admin earnings (from platform commission, not delivery)
    try {
      const seller = await this.userModel.findById(auction.seller).lean();
      const winner = await this.userModel
        .findById(auction.currentWinner)
        .lean();

      const sellerName = seller
        ? `${seller.ownerFirstName || ''} ${seller.ownerLastName || ''}`.trim() ||
          seller.storeName ||
          'Unknown'
        : 'Unknown';

      const buyerName = winner
        ? `${winner.ownerFirstName || ''} ${winner.ownerLastName || ''}`.trim() ||
          winner.name ||
          'Unknown'
        : 'Unknown';

      await this.auctionAdminService.recordEarnings(
        auction._id.toString(),
        auction.currentPrice, // Sale amount (without delivery)
        auction.seller.toString(),
        sellerName,
        auction.currentWinner.toString(),
        buyerName,
        auction.title,
      );

      // გადახდის დადასტურების მეილების გაგზავნა
      await this.sendPaymentConfirmationNotifications(
        auction,
        seller,
        winner,
        deliveryFee,
        totalPayment,
      );
    } catch (error) {
      this.logger.warn(`Failed to record auction admin earnings: ${error}`);
    }

    this.logger.log(
      `Winner payment confirmed: ${auctionId}, Zone: ${paymentDto.deliveryZone}, Delivery: ${deliveryFee} GEL, Total: ${totalPayment} GEL`,
    );

    return {
      success: true,
      auctionId: auction._id,
      artworkPrice: auction.currentPrice,
      deliveryFee,
      totalPaid: totalPayment,
    };
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

  // Initialize BOG payment for auction winner
  async initializeBogPayment(
    auctionId: string,
    userId: string,
    deliveryZone: 'TBILISI' | 'REGION',
    shippingAddress?: {
      address?: string;
      city?: string;
      postalCode?: string;
      country?: string;
      phoneNumber?: string;
    },
  ) {
    const auction = await this.auctionModel.findById(auctionId);
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (auction.currentWinner?.toString() !== userId) {
      throw new ForbiddenException('You are not the winner of this auction');
    }

    if (auction.status !== AuctionStatus.ENDED) {
      throw new BadRequestException('Auction has not ended yet');
    }

    if (auction.isPaid) {
      throw new BadRequestException('Auction is already paid');
    }

    // Calculate delivery fee based on deliveryType
    let deliveryFee = 0;
    if (auction.deliveryType === 'SOULART') {
      // SoulArt delivery: 5% of price, min 15₾, max 50₾
      const fivePercent = auction.currentPrice * 0.05;
      deliveryFee = Math.max(15, Math.min(50, fivePercent));
      deliveryFee = Math.round(deliveryFee * 100) / 100; // Round to 2 decimals
    }
    // ARTIST delivery: free for buyer (0₾)

    const totalPayment = auction.currentPrice + deliveryFee;

    // Generate unique external order ID
    const externalOrderId = randomUUID();

    // Update auction with delivery zone, shipping address, and external order ID
    auction.winnerDeliveryZone = deliveryZone;
    auction.deliveryFee = deliveryFee;
    auction.totalPayment = totalPayment;
    auction.externalOrderId = externalOrderId;

    // Store shipping address if provided
    if (shippingAddress) {
      (auction as any).shippingAddress = shippingAddress;
    }

    await auction.save();

    this.logger.log(
      `BOG payment initialized for auction ${auctionId}, externalOrderId: ${externalOrderId}, total: ${totalPayment} GEL`,
    );

    return {
      auctionId: auction._id.toString(),
      externalOrderId,
      title: auction.title,
      artworkPrice: auction.currentPrice,
      deliveryFee,
      totalPayment,
      mainImage: auction.mainImage,
    };
  }

  // Update auction with BOG payment info after payment creation
  async updateBogPaymentInfo(
    auctionId: string,
    bogOrderId: string,
    externalOrderId: string,
  ) {
    const auction = await this.auctionModel.findById(auctionId);
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    auction.bogOrderId = bogOrderId;
    auction.externalOrderId = externalOrderId;
    await auction.save();

    this.logger.log(
      `Updated auction ${auctionId} with BOG order ID: ${bogOrderId}`,
    );
  }

  // Handle BOG payment callback for auction
  async handleBogPaymentCallback(
    externalOrderId: string,
    status: string,
    bogOrderId?: string,
  ) {
    const auction = await this.auctionModel.findOne({ externalOrderId });
    if (!auction) {
      this.logger.warn(
        `Auction not found for externalOrderId: ${externalOrderId}`,
      );
      return { success: false, message: 'Auction not found' };
    }

    if (auction.isPaid) {
      return { success: true, message: 'Auction already paid' };
    }

    const isPaymentSuccessful = status.toLowerCase() === 'completed';

    if (isPaymentSuccessful) {
      // Update payment status
      auction.isPaid = true;
      auction.paymentDate = new Date();
      auction.paymentResult = {
        id: bogOrderId || externalOrderId,
        status: 'COMPLETED',
        update_time: new Date().toISOString(),
      };

      if (bogOrderId) {
        auction.bogOrderId = bogOrderId;
      }

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

      // Record auction admin earnings
      try {
        const seller = await this.userModel.findById(auction.seller).lean();
        const winner = await this.userModel
          .findById(auction.currentWinner)
          .lean();

        const sellerName = seller
          ? `${seller.ownerFirstName || ''} ${seller.ownerLastName || ''}`.trim() ||
            seller.storeName ||
            seller.name ||
            'Unknown'
          : 'Unknown';

        const buyerName = winner
          ? `${winner.ownerFirstName || ''} ${winner.ownerLastName || ''}`.trim() ||
            winner.name ||
            'Unknown'
          : 'Unknown';

        await this.auctionAdminService.recordEarnings(
          auction._id.toString(),
          auction.currentPrice,
          auction.seller.toString(),
          sellerName,
          auction.currentWinner.toString(),
          buyerName,
          auction.title,
        );
      } catch (error) {
        this.logger.warn(`Failed to record auction admin earnings: ${error}`);
      }

      // Create order record for the auction
      try {
        await this.createAuctionOrder(auction);
        this.logger.log(`Order created for auction ${auction._id}`);
      } catch (error) {
        this.logger.warn(`Failed to create order for auction: ${error}`);
      }

      this.logger.log(
        `Auction ${auction._id} payment completed via BOG callback`,
      );

      return { success: true, message: 'Payment processed successfully' };
    }

    return { success: false, message: 'Payment not completed' };
  }

  // Find auction by external order ID
  async findByExternalOrderId(externalOrderId: string) {
    return this.auctionModel.findOne({ externalOrderId });
  }

  // Verify BOG payment status for auction and update if paid
  async verifyBogPayment(auctionId: string, userId: string) {
    const auction = await this.auctionModel.findById(auctionId);
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (auction.currentWinner?.toString() !== userId) {
      throw new ForbiddenException('You are not the winner of this auction');
    }

    // If already marked as paid, just return the status
    if (auction.isPaid) {
      return {
        auctionId: auction._id.toString(),
        isPaid: true,
        bogOrderId: auction.bogOrderId,
        externalOrderId: auction.externalOrderId,
        paymentResult: auction.paymentResult,
      };
    }

    // If we have a bogOrderId, check payment status from BOG API
    if (auction.bogOrderId) {
      try {
        const paymentsService = await this.moduleRef.get('PaymentsService', {
          strict: false,
        });
        const paymentStatus = await paymentsService.getPaymentStatus(
          auction.bogOrderId,
        );

        const statusKey = paymentStatus?.order_status?.key?.toLowerCase() || '';
        const isPaymentSuccessful = statusKey === 'completed';

        if (isPaymentSuccessful && !auction.isPaid) {
          // Update auction as paid
          await this.handleBogPaymentCallback(
            auction.externalOrderId,
            'completed',
            auction.bogOrderId,
          );

          this.logger.log(
            `Auction ${auctionId} payment verified and updated to paid via BOG API check`,
          );

          return {
            auctionId: auction._id.toString(),
            isPaid: true,
            bogOrderId: auction.bogOrderId,
            externalOrderId: auction.externalOrderId,
            paymentResult: { status: 'COMPLETED' },
          };
        }
      } catch (error) {
        this.logger.warn(
          `Failed to verify payment status from BOG API for auction ${auctionId}: ${error.message}`,
        );
      }
    }

    return {
      auctionId: auction._id.toString(),
      isPaid: auction.isPaid,
      bogOrderId: auction.bogOrderId,
      externalOrderId: auction.externalOrderId,
      paymentResult: auction.paymentResult,
    };
  }

  // Get auction comments with pagination
  async getAuctionComments(auctionId: string, page = 1, limit = 20) {
    const auction = await this.auctionModel
      .findById(auctionId)
      .select('comments')
      .lean();
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    const comments = auction.comments || [];

    // Sort by newest first
    const sortedComments = [...comments].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedComments = sortedComments.slice(
      startIndex,
      startIndex + limit,
    );

    return {
      comments: paginatedComments,
      total: comments.length,
      page,
      limit,
      hasMore: startIndex + limit < comments.length,
    };
  }

  // Add comment to auction
  async addAuctionComment(auctionId: string, user: any, content: string) {
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('Comment content is required');
    }

    if (content.length > 1000) {
      throw new BadRequestException(
        'Comment is too long (max 1000 characters)',
      );
    }

    const auction = await this.auctionModel.findById(auctionId);
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    // Get user name
    const userName =
      user.name ||
      `${user.ownerFirstName || ''} ${user.ownerLastName || ''}`.trim() ||
      user.storeName ||
      'Anonymous';

    const comment = {
      user: user._id,
      content: content.trim(),
      createdAt: new Date(),
      userName,
      userAvatar: user.profilePicture || user.picture,
    };

    auction.comments = auction.comments || [];
    auction.comments.push(comment);
    await auction.save();

    this.logger.log(
      `Comment added to auction ${auctionId} by user ${user._id}`,
    );

    return {
      ...comment,
      user: {
        _id: user._id,
        name: userName,
        avatar: comment.userAvatar,
      },
    };
  }

  // Create order record for a paid auction
  private async createAuctionOrder(auction: AuctionDocument) {
    const winner = await this.userModel.findById(auction.currentWinner).lean();
    if (!winner) {
      throw new Error('Winner not found');
    }

    // Get shipping address from auction
    const shippingAddress = (auction as any).shippingAddress || {};

    const order = new this.orderModel({
      user: auction.currentWinner,
      orderType: 'auction',
      auctionId: auction._id,
      orderItems: [
        {
          name: auction.title,
          nameEn: auction.title,
          qty: 1,
          image: auction.mainImage,
          price: auction.currentPrice,
          originalPrice: auction.currentPrice,
          productId: new Types.ObjectId(), // Placeholder, auction items don't have product IDs
        },
      ],
      shippingDetails: {
        address: shippingAddress.address || '',
        city: shippingAddress.city || '',
        postalCode: shippingAddress.postalCode || '',
        country: shippingAddress.country || 'Georgia',
        phoneNumber: shippingAddress.phoneNumber || winner.phoneNumber || '',
      },
      paymentMethod: 'BOG',
      paymentResult: auction.paymentResult,
      taxPrice: 0,
      shippingPrice: auction.deliveryFee || 0,
      itemsPrice: auction.currentPrice,
      totalPrice:
        auction.totalPayment ||
        auction.currentPrice + (auction.deliveryFee || 0),
      isPaid: true,
      paidAt: new Date().toISOString(),
      status: 'paid',
      externalOrderId: auction.externalOrderId,
      isGuestOrder: false,
    });

    await order.save();
    return order;
  }
}
