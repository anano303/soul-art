import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';

import {
  Commission,
  CommissionDocument,
  CommissionStatus,
  CommissionType,
} from '../schemas/commission.schema';
import { User, UserDocument } from '@/users/schemas/user.schema';
import { Order, OrderDocument } from '@/orders/schemas/order.schema';
import { BalanceService } from '@/users/services/balance.service';
import { EmailService } from '@/email/services/email.services';
import {
  NotificationPayload,
  PushNotificationService,
} from '@/push/services/push-notification.service';
import { Role } from '@/types/role.enum';
import { CreateCommissionDto } from '../dtos/create-commission.dto';
import { SubmitOfferDto } from '../dtos/submit-offer.dto';

const OFFER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h for artists to bid
const SELECTION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h for the buyer to pick
// SoulArt keeps 15% on commissions (single payment AND installment).
export const COMMISSION_COMMISSION_RATE = 0.15;

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(
    @InjectModel(Commission.name)
    private readonly commissionModel: Model<CommissionDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly balanceService: BalanceService,
    private readonly emailService: EmailService,
    private readonly pushService: PushNotificationService,
  ) {}

  private get clientUrl(): string {
    return (
      process.env.CLIENT_URL ||
      process.env.NEXT_PUBLIC_CLIENT_URL ||
      process.env.ALLOWED_ORIGINS?.split(',')[0]?.trim() ||
      'https://soulart.ge'
    );
  }

  private typeLabel(type: CommissionType): string {
    const map: Record<CommissionType, string> = {
      [CommissionType.Portrait]: 'პორტრეტი',
      [CommissionType.Caricature]: 'კარიკატურა',
      [CommissionType.Copy]: 'ნახატის ასლი',
      [CommissionType.Pet]: 'შინაური ცხოველი',
      [CommissionType.Digital]: 'ციფრული ილუსტრაცია',
      [CommissionType.Other]: 'სხვა',
    };
    return map[type] || 'ნამუშევარი';
  }

  // ─────────────────────────── CREATE ───────────────────────────
  async create(
    dto: CreateCommissionDto,
    currentUser: UserDocument,
    referenceImages: string[],
  ) {
    const now = new Date();
    const offersDeadline = new Date(now.getTime() + OFFER_WINDOW_MS);
    const selectionDeadline = new Date(
      offersDeadline.getTime() + SELECTION_WINDOW_MS,
    );

    // Validate the targeted artist (direct request from an artist's page).
    let targetArtist: string | null = null;
    if (dto.targetArtistId) {
      const artist = await this.userModel
        .findById(dto.targetArtistId)
        .select('_id artistOpenForCommissions')
        .lean();
      if (artist?.artistOpenForCommissions) {
        targetArtist = artist._id.toString();
      }
    }

    const commission = await this.commissionModel.create({
      requester: currentUser._id,
      targetArtist,
      requesterName: currentUser.name,
      requesterEmail: currentUser.email,
      requesterPhone: dto.phone,
      type: dto.type,
      referenceImages,
      description: dto.description,
      size: dto.size,
      material: dto.material,
      budget: dto.budget,
      shippingDetails: {
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        country: dto.country || 'Georgia',
        phoneNumber: dto.phone,
      },
      desiredDueDate: dto.desiredDueDate ? new Date(dto.desiredDueDate) : undefined,
      status: CommissionStatus.Open,
      offersDeadline,
      selectionDeadline,
      offers: [],
    });

    void this.notifyArtistsOfNewRequest(commission);

    return commission;
  }

  // ─────────────────────────── OFFER ───────────────────────────
  async submitOffer(
    commissionId: string,
    artist: UserDocument,
    dto: SubmitOfferDto,
  ) {
    const commission = await this.commissionModel.findById(commissionId);
    if (!commission) {
      throw new NotFoundException('შეკვეთა ვერ მოიძებნა');
    }

    if (
      commission.status !== CommissionStatus.Open ||
      commission.offersDeadline.getTime() < Date.now()
    ) {
      throw new BadRequestException('შეთავაზების ვადა დასრულებულია');
    }

    if (commission.requester.toString() === String(artist._id)) {
      throw new BadRequestException('საკუთარ შეკვეთაზე ვერ განათავსებ შეთავაზებას');
    }

    if (
      commission.targetArtist &&
      commission.targetArtist.toString() !== String(artist._id)
    ) {
      throw new ForbiddenException('ეს შეკვეთა კონკრეტული მხატვრისთვისაა');
    }

    const artistName =
      artist.storeName ||
      `${artist.ownerFirstName || ''} ${artist.ownerLastName || ''}`.trim() ||
      artist.name ||
      'მხატვარი';

    // One offer per artist — update if it already exists.
    const existing = commission.offers.find(
      (o) => o.artist.toString() === String(artist._id),
    );
    if (existing) {
      existing.price = dto.price;
      existing.deliveryPrice = dto.deliveryPrice;
      existing.estimatedDays = dto.estimatedDays;
      existing.message = dto.message;
      existing.artistName = artistName;
    } else {
      commission.offers.push({
        artist: artist._id as any,
        artistName,
        price: dto.price,
        deliveryPrice: dto.deliveryPrice,
        estimatedDays: dto.estimatedDays,
        message: dto.message,
        createdAt: new Date(),
      });
    }

    await commission.save();

    void this.notifyBuyerOfNewOffer(commission, artistName);

    return { success: true };
  }

  // ─────────────────────────── SELECT + PAY ───────────────────────────
  async selectOffer(
    commissionId: string,
    buyer: UserDocument,
    offerId: string,
  ) {
    const commission = await this.commissionModel.findById(commissionId);
    if (!commission) {
      throw new NotFoundException('შეკვეთა ვერ მოიძებნა');
    }

    if (commission.requester.toString() !== String(buyer._id)) {
      throw new ForbiddenException('ეს შეკვეთა თქვენი არ არის');
    }

    if (commission.isPaid) {
      throw new BadRequestException('შეკვეთა უკვე გადახდილია');
    }

    if (
      commission.status !== CommissionStatus.Open &&
      commission.status !== CommissionStatus.Selecting
    ) {
      throw new BadRequestException('შერჩევის ვადა დასრულებულია');
    }

    if (commission.selectionDeadline.getTime() < Date.now()) {
      throw new BadRequestException('შერჩევის ვადა დასრულებულია');
    }

    const offer = commission.offers.find(
      (o) => (o as any)._id.toString() === offerId,
    );
    if (!offer) {
      throw new NotFoundException('შეთავაზება ვერ მოიძებნა');
    }

    const totalPrice = offer.price + (offer.deliveryPrice || 0);

    commission.selectedOffer = {
      artist: offer.artist as any,
      artistName: offer.artistName,
      price: offer.price,
      deliveryPrice: offer.deliveryPrice || 0,
      estimatedDays: offer.estimatedDays,
      totalPrice,
    };
    commission.status = CommissionStatus.Selecting;

    // Reuse the existing unpaid order if the buyer re-opens checkout or switches
    // offer (prevents orphan orders); otherwise create a fresh one.
    let order = commission.orderId
      ? await this.orderModel.findById(commission.orderId)
      : null;
    if (order && !order.isPaid) {
      order.itemsPrice = offer.price;
      order.shippingPrice = offer.deliveryPrice || 0;
      order.totalPrice = totalPrice;
      if (order.orderItems?.[0]) {
        order.orderItems[0].price = offer.price;
        order.orderItems[0].originalPrice = offer.price;
        order.orderItems[0].name = `${this.typeLabel(commission.type)} — ${commission.size}`;
        (order.orderItems[0] as any).seller = offer.artist;
      }
      (order as any).seller = offer.artist;
      await order.save();
    } else {
      const externalOrderId = `commission_${randomUUID()}`;
      commission.externalOrderId = externalOrderId;
      order = await this.createCommissionOrder(commission, externalOrderId);
      commission.orderId = order._id as any;
    }
    await commission.save();

    return {
      commissionId: commission._id.toString(),
      orderId: order._id.toString(),
      externalOrderId: commission.externalOrderId,
      title: `${this.typeLabel(commission.type)} — ${commission.size}`,
      artworkPrice: offer.price,
      deliveryFee: offer.deliveryPrice || 0,
      totalPayment: totalPrice,
    };
  }

  // Creates the (initially unpaid) Order tied to a selected commission.
  private async createCommissionOrder(
    commission: CommissionDocument,
    externalOrderId: string,
  ) {
    const sel = commission.selectedOffer!;
    const ship = commission.shippingDetails || ({} as any);

    const order = new this.orderModel({
      user: commission.requester,
      seller: sel.artist,
      orderType: 'commission',
      orderItems: [
        {
          name: `${this.typeLabel(commission.type)} — ${commission.size}`,
          nameEn: `Commission — ${commission.type}`,
          qty: 1,
          image: commission.referenceImages?.[0] || '',
          price: sel.price,
          originalPrice: sel.price,
          productId: new Types.ObjectId(), // placeholder — commissions have no product
          seller: sel.artist,
        },
      ],
      shippingDetails: {
        address: ship.address || '',
        city: ship.city || '',
        postalCode: ship.postalCode || '',
        country: ship.country || 'Georgia',
        phoneNumber: ship.phoneNumber || commission.requesterPhone || '',
      },
      paymentMethod: 'PENDING',
      taxPrice: 0,
      shippingPrice: sel.deliveryPrice || 0,
      itemsPrice: sel.price,
      totalPrice: sel.totalPrice,
      isPaid: false,
      status: 'pending',
      externalOrderId,
      isGuestOrder: false,
    });

    await order.save();
    this.logger.log(
      `Commission order created (pending): ${order._id} for commission ${commission._id}`,
    );
    return order;
  }

  // ─────────────────────────── PAYMENT SUCCESS ───────────────────────────
  // Single payment (BOG): PaymentsService routes `commission_` ids here.
  async handleBogPaymentCallback(
    externalOrderId: string,
    status: string,
    bogOrderId?: string,
  ): Promise<{ success: boolean; message: string }> {
    if (status.toLowerCase() !== 'completed') {
      return { success: false, message: 'Payment not completed' };
    }
    const commission = await this.commissionModel.findOne({ externalOrderId });
    if (!commission) {
      return { success: false, message: 'Commission not found' };
    }
    await this.markPaid(commission, 'BOG', bogOrderId || externalOrderId);
    return { success: true, message: 'Commission payment processed' };
  }

  // Installment (Credo): CredoInstallmentController calls this by order id.
  async markPaidByOrderId(orderId: string, method: string) {
    const commission = await this.commissionModel.findOne({ orderId });
    if (!commission) return;
    await this.markPaid(commission, method, String(orderId));
  }

  private async markPaid(
    commission: CommissionDocument,
    method: string,
    paymentRef: string,
  ) {
    if (commission.isPaid) return;

    commission.isPaid = true;
    commission.paidAt = new Date();
    commission.status = CommissionStatus.Paid;
    commission.paymentResult = {
      id: paymentRef,
      status: 'COMPLETED',
      update_time: new Date().toISOString(),
    };
    await commission.save();

    // Sync the linked order to paid.
    if (commission.orderId) {
      await this.orderModel.findByIdAndUpdate(commission.orderId, {
        isPaid: true,
        paidAt: new Date().toISOString(),
        status: 'paid',
        paymentMethod: method,
        paymentResult: commission.paymentResult,
      });
    }

    void this.notifyPaid(commission);
  }

  // ─────────────────────────── COMPLETE (release escrow) ───────────────────────────
  // Called by admin (any commission) or by the buyer confirming receipt.
  async complete(
    commissionId: string,
    actor?: { userId: string; isAdmin: boolean },
  ) {
    const commission = await this.commissionModel.findById(commissionId);
    if (!commission) {
      throw new NotFoundException('შეკვეთა ვერ მოიძებნა');
    }
    if (
      actor &&
      !actor.isAdmin &&
      commission.requester.toString() !== actor.userId
    ) {
      throw new ForbiddenException('ეს შეკვეთა თქვენი არ არის');
    }
    if (!commission.isPaid) {
      throw new BadRequestException('შეკვეთა არ არის გადახდილი');
    }
    if (commission.status === CommissionStatus.Completed) {
      return commission;
    }

    const sel = commission.selectedOffer!;
    // Artist delivers, so the delivery fee goes fully to the artist; SoulArt
    // keeps 15% of the artwork price only.
    const artistEarnings = Number(
      (
        sel.price * (1 - COMMISSION_COMMISSION_RATE) +
        (sel.deliveryPrice || 0)
      ).toFixed(2),
    );

    await this.balanceService.addCommissionEarnings(
      sel.artist.toString(),
      artistEarnings,
      commission._id.toString(),
      `${this.typeLabel(commission.type)} — ${commission.size}`,
    );

    // Mark the linked order delivered.
    if (commission.orderId) {
      await this.orderModel.findByIdAndUpdate(commission.orderId, {
        isDelivered: true,
        deliveredAt: new Date().toISOString(),
        status: 'delivered',
      });
    }

    commission.status = CommissionStatus.Completed;
    commission.completedAt = new Date();
    await commission.save();

    void this.notifyCompleted(commission);

    return commission;
  }

  // ─────────────────────────── QUERIES ───────────────────────────
  async findMine(userId: string) {
    return this.commissionModel
      .find({ requester: userId })
      .sort({ createdAt: -1 })
      .lean();
  }

  // Open requests visible to an opted-in artist. Buyer contact is stripped.
  async findAvailable(artist: UserDocument) {
    const now = new Date();
    const filter: Record<string, unknown> = {
      status: CommissionStatus.Open,
      offersDeadline: { $gt: now },
      // Open (non-targeted) requests reach everyone; targeted ones reach only
      // the chosen artist.
      $or: [{ targetArtist: null }, { targetArtist: artist._id }],
    };

    const items = await this.commissionModel
      .find(filter)
      .select(
        'type referenceImages description size material budget desiredDueDate offersDeadline offers createdAt shippingDetails targetArtist requester',
      )
      .sort({ createdAt: -1 })
      .lean();

    // Buyer track record (anonymous): how many commissions they PAID and how
    // many they abandoned (got offers but never paid before the deadline).
    // Lets artists judge reliability without exposing the buyer's identity.
    const requesterIds = [
      ...new Set(items.map((c: any) => c.requester?.toString()).filter(Boolean)),
    ];
    const paidMap = new Map<string, number>();
    const abandonedMap = new Map<string, number>();
    if (requesterIds.length > 0) {
      const [paidAgg, abandonedAgg] = await Promise.all([
        this.commissionModel.aggregate([
          { $match: { requester: { $in: requesterIds.map((id) => new Types.ObjectId(id)) }, isPaid: true } },
          { $group: { _id: '$requester', count: { $sum: 1 } } },
        ]),
        this.commissionModel.aggregate([
          {
            $match: {
              requester: { $in: requesterIds.map((id) => new Types.ObjectId(id)) },
              status: CommissionStatus.Expired,
              isPaid: false,
              'offers.0': { $exists: true },
            },
          },
          { $group: { _id: '$requester', count: { $sum: 1 } } },
        ]),
      ]);
      paidAgg.forEach((s: any) => paidMap.set(s._id.toString(), s.count));
      abandonedAgg.forEach((s: any) =>
        abandonedMap.set(s._id.toString(), s.count),
      );
    }

    // Strip other artists' offers + private contact. Expose only the delivery
    // city/country so the artist can price delivery (they handle it).
    return items.map((c: any) => {
      const myOffer = (c.offers || []).find(
        (o: any) => o.artist.toString() === String(artist._id),
      );
      const rid = c.requester?.toString() || '';
      const buyerPaidCount = paidMap.get(rid) || 0;
      const buyerAbandonedCount = abandonedMap.get(rid) || 0;
      // trusted → has paid before; risky → abandoned offers without paying;
      // new → no history yet.
      const buyerTrust: 'trusted' | 'risky' | 'new' =
        buyerPaidCount > 0
          ? 'trusted'
          : buyerAbandonedCount > 0
            ? 'risky'
            : 'new';
      return {
        ...c,
        offersCount: (c.offers || []).length,
        myOffer: myOffer || null,
        offers: undefined,
        isDirect: !!c.targetArtist,
        deliveryCity: c.shippingDetails?.city || '',
        deliveryCountry: c.shippingDetails?.country || '',
        shippingDetails: undefined,
        requester: undefined, // never expose buyer identity
        buyerPaidCount,
        buyerAbandonedCount,
        buyerTrust,
      };
    });
  }

  // Artist's own submitted offers with the request context.
  async findMyOffers(artistId: string) {
    const items = await this.commissionModel
      .find({ 'offers.artist': artistId })
      .select(
        'type size status isPaid referenceImages offers selectedOffer createdAt',
      )
      .sort({ createdAt: -1 })
      .lean();

    return items.map((c: any) => {
      const myOffer = (c.offers || []).find(
        (o: any) => o.artist.toString() === String(artistId),
      );
      const selectedMine =
        c.selectedOffer &&
        c.selectedOffer.artist &&
        c.selectedOffer.artist.toString() === String(artistId);
      return {
        _id: c._id,
        type: c.type,
        size: c.size,
        status: c.status,
        isPaid: !!c.isPaid,
        referenceImages: c.referenceImages,
        myOffer: myOffer || null,
        selected: !!selectedMine,
        createdAt: c.createdAt,
      };
    });
  }

  async findAll(status?: string, page = 1, limit = 50) {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.commissionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('requester', 'name email')
        .populate('offers.artist', 'name storeName artistRating')
        .lean(),
      this.commissionModel.countDocuments(filter),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  // Buyer/admin view of a single request — offers enriched with artist trust stats.
  async findOneForBuyer(commissionId: string, userId: string, isAdmin: boolean) {
    const commission = await this.commissionModel.findById(commissionId).lean();
    if (!commission) {
      throw new NotFoundException('შეკვეთა ვერ მოიძებნა');
    }
    if (!isAdmin && commission.requester.toString() !== String(userId)) {
      throw new ForbiddenException('ეს შეკვეთა თქვენი არ არის');
    }

    const offers = await this.enrichOffersWithStats(commission);
    return { ...commission, offers };
  }

  // Attach ⭐ rating, completed commissions, avg response time, completion rate.
  private async enrichOffersWithStats(commission: any) {
    const offers = commission.offers || [];
    return Promise.all(
      offers.map(async (o: any) => {
        const artistId = o.artist.toString();
        const [artist, completed, selectedTotal] = await Promise.all([
          this.userModel
            .findById(artistId)
            .select('name storeName artistRating artistReviewsCount artistSlug')
            .lean(),
          this.commissionModel.countDocuments({
            'selectedOffer.artist': artistId,
            status: CommissionStatus.Completed,
          }),
          this.commissionModel.countDocuments({
            'selectedOffer.artist': artistId,
          }),
        ]);

        // Average response time = offer.createdAt − request.createdAt.
        const respMs =
          new Date(o.createdAt).getTime() -
          new Date(commission.createdAt).getTime();

        return {
          _id: o._id,
          artistId,
          artistSlug: artist?.artistSlug || null,
          artistName:
            o.artistName || artist?.storeName || artist?.name || 'მხატვარი',
          price: o.price,
          deliveryPrice: o.deliveryPrice || 0,
          totalPrice: o.price + (o.deliveryPrice || 0),
          estimatedDays: o.estimatedDays,
          message: o.message,
          rating: artist?.artistRating || 0,
          reviewsCount: artist?.artistReviewsCount || 0,
          completedCommissions: completed,
          completionRate:
            selectedTotal > 0
              ? Math.round((completed / selectedTotal) * 100)
              : null,
          avgResponseHours: Math.max(0, Math.round(respMs / (60 * 60 * 1000))),
        };
      }),
    );
  }

  // ─────────────────────────── CRON: expiry ───────────────────────────
  @Cron(CronExpression.EVERY_10_MINUTES)
  async expireStale() {
    const now = new Date();
    try {
      // Offer window closed with no selection → move to "selecting".
      await this.commissionModel.updateMany(
        {
          status: CommissionStatus.Open,
          offersDeadline: { $lte: now },
          'offers.0': { $exists: true },
        },
        { $set: { status: CommissionStatus.Selecting } },
      );

      // Offer window closed with zero offers → expired.
      await this.commissionModel.updateMany(
        {
          status: CommissionStatus.Open,
          offersDeadline: { $lte: now },
          offers: { $size: 0 },
        },
        { $set: { status: CommissionStatus.Expired } },
      );

      // Selection window passed without payment → expired.
      await this.commissionModel.updateMany(
        {
          status: CommissionStatus.Selecting,
          selectionDeadline: { $lte: now },
          isPaid: false,
        },
        { $set: { status: CommissionStatus.Expired } },
      );
    } catch (err) {
      this.logger.error(
        `Commission expiry cron failed: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  // ─────────────────────────── NOTIFY HELPERS ───────────────────────────
  private async pushInApp(
    userId: string,
    item: {
      title: string;
      message: string;
      type: 'info' | 'warning' | 'success';
      actionUrl: string;
      actionLabel: string;
    },
  ) {
    try {
      const id = `cm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await this.userModel.updateOne(
        { _id: userId },
        {
          $push: {
            sellerNotifications: {
              $each: [
                {
                  id,
                  title: item.title,
                  message: item.message,
                  type: item.type,
                  category: 'commission',
                  actionUrl: item.actionUrl,
                  actionLabel: item.actionLabel,
                  createdAt: new Date(),
                  readAt: null,
                },
              ],
              $slice: -80,
            },
          },
        },
      );
    } catch (err) {
      this.logger.error(
        `Failed to push in-app notification: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  private async notifyArtistsOfNewRequest(commission: CommissionDocument) {
    try {
      const base = this.clientUrl;
      const label = this.typeLabel(commission.type);

      // Targeted request → only that artist; otherwise every opted-in artist.
      let artistIds: string[];
      if (commission.targetArtist) {
        artistIds = [commission.targetArtist.toString()];
      } else {
        const artists = await this.userModel
          .find({
            artistOpenForCommissions: true,
            role: { $in: [Role.Seller, Role.SellerAndSalesManager] },
          })
          .select('_id')
          .lean();
        artistIds = artists.map((a) => a._id.toString());
      }

      // Reminder: the artist is responsible for delivery and must include its
      // price in the offer.
      const deliveryNote = ` მიწოდებას შენ უზრუნველყოფ — მიუთითე მიწოდების ფასი (${
        commission.shippingDetails?.city || 'მისამართის მიხედვით'
      }).`;

      const payload: NotificationPayload = {
        title: commission.targetArtist
          ? '🎨 პირდაპირი ინდივიდუალური შეკვეთა შენთვის'
          : '🎨 ახალი ინდივიდუალური შეკვეთა',
        body: `${label} — ${commission.size}. განათავსე შეთავაზება 24 საათში.${deliveryNote}`,
        icon: `${base}/icons/android/icon-192x192.png`,
        badge: `${base}/icons/pwa/notification-badge.png`,
        data: {
          url: `${base}/profile/commissions`,
          type: 'commission_request',
          id: commission._id.toString(),
        },
        tag: `commission-${commission._id.toString()}`,
        requireInteraction: true,
      };
      if (artistIds.length > 0) {
        await this.pushService.sendToMultipleUsers(artistIds, payload);
        await Promise.all(
          artistIds.map((id) =>
            this.pushInApp(id, {
              title: 'ახალი ინდივიდუალური შეკვეთა',
              message: `${label} — ${commission.size}`,
              type: 'info',
              actionUrl: '/profile/commissions',
              actionLabel: 'ნახვა',
            }),
          ),
        );
      }

      // Admin visibility.
      await this.pushService.sendToAdmins({
        ...payload,
        title: '🎨 ახალი ინდივიდუალური შეკვეთა (მონიტორინგი)',
        data: {
          url: `${base}/admin/commissions`,
          type: 'commission_request',
          id: commission._id.toString(),
        },
        tag: `commission-admin-${commission._id.toString()}`,
        requireInteraction: false,
      });

      const adminEmail = process.env.ADMIN_EMAIL || 'soulartgeorgia@gmail.com';
      await this.emailService.sendMail({
        to: adminEmail,
        subject: `🎨 ახალი ინდივიდუალური შეკვეთა — ${label}`,
        html: this.simpleEmail(
          'ახალი ინდივიდუალური შეკვეთა',
          `<p>ტიპი: <strong>${label}</strong></p><p>ზომა: ${commission.size}</p><p>${commission.description}</p>`,
          `${base}/admin/commissions`,
          'ადმინ პანელში ნახვა',
        ),
      });
    } catch (err) {
      this.logger.error(
        `Failed to notify artists of commission ${commission._id}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  private async notifyBuyerOfNewOffer(
    commission: CommissionDocument,
    artistName: string,
  ) {
    try {
      const base = this.clientUrl;
      const label = this.typeLabel(commission.type);
      await this.pushService.sendToUser(commission.requester.toString(), {
        title: '💌 ახალი შეთავაზება შენს შეკვეთაზე',
        body: `${label} — ${artistName}-მ გამოგიგზავნა შეთავაზება.`,
        icon: `${base}/icons/android/icon-192x192.png`,
        badge: `${base}/icons/pwa/notification-badge.png`,
        data: {
          url: `${base}/commissions`,
          type: 'commission_offer',
          id: commission._id.toString(),
        },
        tag: `commission-offer-${commission._id.toString()}`,
        requireInteraction: false,
      });
      await this.pushInApp(commission.requester.toString(), {
        title: 'ახალი შეთავაზება',
        message: `${label} — ${artistName}`,
        type: 'info',
        actionUrl: '/commissions',
        actionLabel: 'ნახვა',
      });
    } catch (err) {
      this.logger.error(
        `Failed to notify buyer of offer: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  private async notifyPaid(commission: CommissionDocument) {
    try {
      const base = this.clientUrl;
      const label = this.typeLabel(commission.type);
      const artistId = commission.selectedOffer?.artist?.toString();
      if (artistId) {
        await this.pushService.sendToUser(artistId, {
          title: '✅ შეკვეთა გადახდილია — დაიწყე მუშაობა',
          body: `${label} — ${commission.size}. კლიენტმა გადაიხადა, დაიწყე ნამუშევარი.`,
          icon: `${base}/icons/android/icon-192x192.png`,
          badge: `${base}/icons/pwa/notification-badge.png`,
          data: {
            url: `${base}/profile/commissions`,
            type: 'commission_paid',
            id: commission._id.toString(),
          },
          tag: `commission-paid-${commission._id.toString()}`,
          requireInteraction: true,
        });
        await this.pushInApp(artistId, {
          title: 'შეკვეთა გადახდილია',
          message: `${label} — დაიწყე მუშაობა`,
          type: 'success',
          actionUrl: '/profile/commissions',
          actionLabel: 'ნახვა',
        });
      }
      await this.pushService.sendToAdmins({
        title: '💰 ინდივიდუალური შეკვეთა გადახდილია',
        body: `${label} — ${commission.selectedOffer?.totalPrice} ₾`,
        icon: `${base}/icons/android/icon-192x192.png`,
        badge: `${base}/icons/pwa/notification-badge.png`,
        data: {
          url: `${base}/admin/commissions`,
          type: 'commission_paid',
          id: commission._id.toString(),
        },
        tag: `commission-paid-admin-${commission._id.toString()}`,
        requireInteraction: false,
      });
    } catch (err) {
      this.logger.error(
        `Failed to notify paid: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private async notifyCompleted(commission: CommissionDocument) {
    try {
      const base = this.clientUrl;
      const label = this.typeLabel(commission.type);
      await this.pushService.sendToUser(commission.requester.toString(), {
        title: '🎉 შენი შეკვეთა დასრულდა',
        body: `${label} — ${commission.size} მზადაა და გამოგზავნილია.`,
        icon: `${base}/icons/android/icon-192x192.png`,
        badge: `${base}/icons/pwa/notification-badge.png`,
        data: {
          url: `${base}/commissions`,
          type: 'commission_completed',
          id: commission._id.toString(),
        },
        tag: `commission-done-${commission._id.toString()}`,
        requireInteraction: false,
      });
      const artistId = commission.selectedOffer?.artist?.toString();
      if (artistId) {
        await this.pushInApp(artistId, {
          title: 'შეკვეთა დასრულდა',
          message: `${label} — თანხა ჩაირიცხა ბალანსზე`,
          type: 'success',
          actionUrl: '/profile/commissions',
          actionLabel: 'ნახვა',
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to notify completed: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  private simpleEmail(
    title: string,
    bodyHtml: string,
    actionUrl: string,
    actionLabel: string,
  ): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #ece7da;border-radius:14px;overflow:hidden">
        <div style="background:#012645;color:#fff;padding:20px 24px">
          <h2 style="margin:0;font-size:18px">${title}</h2>
        </div>
        <div style="padding:24px;color:#1f2937">
          ${bodyHtml}
          <a href="${actionUrl}" style="display:inline-block;margin-top:18px;background:linear-gradient(135deg,#012645,#02457a);color:#fff;text-decoration:none;padding:11px 24px;border-radius:100px;font-weight:700">${actionLabel}</a>
        </div>
      </div>`;
  }
}
