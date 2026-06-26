import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  PriceOffer,
  PriceOfferDocument,
  PriceOfferStatus,
} from '../schemas/price-offer.schema';
import { Product } from '@/products/schemas/product.schema';
import { User, UserDocument } from '@/users/schemas/user.schema';
import { Role } from '@/types/role.enum';
import { hashPassword } from '@/utils/password';
import { EmailService } from '@/email/services/email.services';
import {
  NotificationPayload,
  PushNotificationService,
} from '@/push/services/push-notification.service';
import { CreateOfferDto } from '../dtos/create-offer.dto';
import { RespondOfferDto } from '../dtos/respond-offer.dto';

@Injectable()
export class PriceOffersService {
  private readonly logger = new Logger(PriceOffersService.name);

  constructor(
    @InjectModel(PriceOffer.name)
    private readonly offerModel: Model<PriceOfferDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
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

  private effectivePrice(product: {
    price: number;
    discountPercentage?: number;
  }): number {
    if (product.discountPercentage && product.discountPercentage > 0) {
      return Number(
        (product.price * (1 - product.discountPercentage / 100)).toFixed(2),
      );
    }
    return product.price;
  }

  // ─────────────────────────── CREATE ───────────────────────────
  async create(dto: CreateOfferDto, currentUser?: UserDocument) {
    const product = await this.productModel
      .findById(dto.productId)
      .select('name price discountPercentage user')
      .lean();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const sellerId = product.user?.toString();
    if (!sellerId) {
      throw new BadRequestException('Product has no seller');
    }

    // Resolve the requester (existing logged-in user, or inline registration).
    let requesterId: string;
    let requesterName: string | undefined;
    let requesterEmail: string | undefined;
    let registered = false;

    if (currentUser) {
      requesterId = String(currentUser._id);
      const u = await this.userModel
        .findById(requesterId)
        .select('name email')
        .lean();
      requesterName = u?.name;
      requesterEmail = u?.email;
    } else {
      if (!dto.name || !dto.email || !dto.password) {
        throw new BadRequestException(
          'Registration details (name, email, password) are required to make an offer',
        );
      }
      const existing = await this.userModel
        .findOne({ email: dto.email.toLowerCase() })
        .select('_id')
        .lean();
      if (existing) {
        throw new BadRequestException(
          'EMAIL_EXISTS', // frontend maps this to "please log in"
        );
      }
      const created = await this.userModel.create({
        name: dto.name,
        email: dto.email.toLowerCase(),
        password: await hashPassword(dto.password),
        role: Role.User,
      });
      requesterId = created._id.toString();
      requesterName = created.name;
      requesterEmail = created.email;
      registered = true;
    }

    if (requesterId === sellerId) {
      throw new BadRequestException('You cannot make an offer on your own product');
    }

    const originalPrice = this.effectivePrice(product);
    if (dto.offeredPrice <= 0 || dto.offeredPrice >= originalPrice) {
      throw new BadRequestException(
        'Offered price must be greater than 0 and lower than the current price',
      );
    }

    // Block a second pending offer for the same product by the same requester.
    const existingPending = await this.offerModel.findOne({
      requester: requesterId,
      product: dto.productId,
      status: PriceOfferStatus.Pending,
    });
    if (existingPending) {
      throw new BadRequestException(
        'You already have a pending offer for this product',
      );
    }

    const offer = await this.offerModel.create({
      product: dto.productId,
      productName: product.name,
      seller: sellerId,
      requester: requesterId,
      requesterName,
      requesterEmail,
      requesterPhone: dto.phone,
      originalPrice,
      offeredPrice: dto.offeredPrice,
      message: dto.message,
      status: PriceOfferStatus.Pending,
    });

    // Notify the seller (push + email) — non-blocking.
    void this.notifySellerOfNewOffer(sellerId, product.name, offer);

    return { offer, registered };
  }

  // ─────────────────────────── RESPOND ───────────────────────────
  async respond(
    offerId: string,
    actor: UserDocument,
    action: 'accept' | 'reject',
    dto: RespondOfferDto,
  ) {
    const offer = await this.offerModel.findById(offerId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const isAdmin = actor.role === Role.Admin;
    const isSeller = offer.seller?.toString() === String(actor._id);
    if (!isAdmin && !isSeller) {
      throw new ForbiddenException('You cannot respond to this offer');
    }

    if (offer.status !== PriceOfferStatus.Pending) {
      throw new BadRequestException('This offer has already been answered');
    }

    offer.status =
      action === 'accept'
        ? PriceOfferStatus.Accepted
        : PriceOfferStatus.Rejected;
    offer.sellerMessage = dto.sellerMessage;
    offer.respondedAt = new Date();
    await offer.save();

    // Notify the requester (push + email).
    void this.notifyRequesterOfResponse(offer);

    return offer;
  }

  // ─────────────────────────── QUERIES ───────────────────────────
  async findForSeller(sellerId: string, status?: string) {
    const filter: Record<string, unknown> = { seller: sellerId };
    if (status) filter.status = status;
    // IMPORTANT: the seller must NOT see the buyer's identity/contact.
    // Only product, prices, the negotiation message and status are returned.
    return this.offerModel
      .find(filter)
      .select(
        'product productName originalPrice offeredPrice message sellerMessage status used createdAt respondedAt',
      )
      .sort({ createdAt: -1 })
      .populate('product', 'name images price')
      .lean();
  }

  async findAll(status?: string, page = 1, limit = 50) {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.offerModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('product', 'name images price')
        .populate('requester', 'name email')
        .populate('seller', 'name email storeName')
        .lean(),
      this.offerModel.countDocuments(filter),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  // Used by the cart/order flow to apply a personally-accepted price.
  async getAcceptedOffer(userId: string, productId: string) {
    return this.offerModel
      .findOne({
        requester: userId,
        product: productId,
        status: PriceOfferStatus.Accepted,
        used: false,
      })
      .sort({ respondedAt: -1 })
      .lean();
  }

  async markUsed(offerId: string) {
    await this.offerModel.updateOne(
      { _id: offerId },
      { $set: { used: true } },
    );
  }

  // ─────────────────────────── NOTIFY HELPERS ───────────────────────────

  // Pushes an entry to a user's in-app notification feed (header bell).
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
      const id = `po-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
                  category: 'product',
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

  private async notifySellerOfNewOffer(
    sellerId: string,
    productName: string,
    offer: PriceOfferDocument,
  ) {
    try {
      const base = this.clientUrl;
      const payload: NotificationPayload = {
        title: '💰 ახალი ფასის შეთავაზება',
        body: `"${productName}" — შემოთავაზებული ფასი ₾${offer.offeredPrice} (ნაცვლად ₾${offer.originalPrice})`,
        icon: `${base}/icons/android/icon-192x192.png`,
        badge: `${base}/icons/pwa/notification-badge.png`,
        data: {
          url: `${base}/profile/offers`,
          type: 'price_offer_received',
          id: offer._id.toString(),
        },
        tag: `price-offer-${offer._id.toString()}`,
        requireInteraction: true,
      };
      await this.pushService.sendToUser(sellerId, payload);

      // In-app header bell for the seller.
      await this.pushInApp(sellerId, {
        title: 'ახალი ფასის შეთავაზება',
        message: `"${productName}" — ₾${offer.offeredPrice} (ნაცვლად ₾${offer.originalPrice})`,
        type: 'info',
        actionUrl: '/profile/offers',
        actionLabel: 'ნახვა',
      });

      const seller = await this.userModel
        .findById(sellerId)
        .select('name email storeName')
        .lean();
      if (seller?.email) {
        await this.emailService.sendMail({
          to: seller.email,
          subject: `💰 ახალი ფასის შეთავაზება — ${productName}`,
          html: this.sellerEmailHtml(seller.name || '', productName, offer, base),
        });
      }

      // ── Admin gets full visibility (which product, which seller, buyer contact) ──
      await this.pushService.sendToAdmins({
        title: '💰 ახალი ფასის შეთავაზება (მონიტორინგი)',
        body: `"${productName}" — ₾${offer.offeredPrice} (₾${offer.originalPrice}) • გამყიდველი: ${seller?.storeName || seller?.name || '—'}`,
        icon: `${base}/icons/android/icon-192x192.png`,
        badge: `${base}/icons/pwa/notification-badge.png`,
        data: {
          url: `${base}/admin/price-offers`,
          type: 'price_offer_received',
          id: offer._id.toString(),
        },
        tag: `price-offer-admin-${offer._id.toString()}`,
        requireInteraction: false,
      });

      const adminEmail = process.env.ADMIN_EMAIL || 'soulartgeorgia@gmail.com';
      await this.emailService.sendMail({
        to: adminEmail,
        subject: `💰 ახალი ფასის შეთავაზება — ${productName} (${seller?.storeName || seller?.name || ''})`,
        html: this.adminEmailHtml(
          productName,
          seller?.storeName || seller?.name || '—',
          seller?.email || '—',
          offer,
          base,
        ),
      });
    } catch (err) {
      this.logger.error(
        `Failed to notify seller of offer ${offer._id}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  private async notifyRequesterOfResponse(offer: PriceOfferDocument) {
    try {
      const base = this.clientUrl;
      const accepted = offer.status === PriceOfferStatus.Accepted;
      const payload: NotificationPayload = {
        title: accepted
          ? '✅ შენი ფასი დადასტურდა!'
          : '❌ შენი შეთავაზება უარყოფილია',
        body: accepted
          ? `"${offer.productName}" — ახალი ფასი შენთვის: ₾${offer.offeredPrice}. დაამატე კალათაში.`
          : `"${offer.productName}" — სამწუხაროდ, გამყიდველმა უარყო შენი ფასი.`,
        icon: `${base}/icons/android/icon-192x192.png`,
        badge: `${base}/icons/pwa/notification-badge.png`,
        data: {
          url: `${base}/products/${offer.product.toString()}`,
          type: accepted ? 'price_offer_accepted' : 'price_offer_rejected',
          id: offer._id.toString(),
        },
        tag: `price-offer-resp-${offer._id.toString()}`,
        requireInteraction: true,
      };
      await this.pushService.sendToUser(offer.requester.toString(), payload);

      // In-app header bell for the requester.
      await this.pushInApp(offer.requester.toString(), {
        title: accepted
          ? 'შენი ფასი დადასტურდა ✅'
          : 'შენი შეთავაზება უარყოფილია',
        message: `"${offer.productName}" — ₾${offer.offeredPrice}`,
        type: accepted ? 'success' : 'info',
        actionUrl: `/products/${offer.product.toString()}`,
        actionLabel: accepted ? 'პროდუქტზე გადასვლა' : 'ნახვა',
      });

      if (offer.requesterEmail) {
        await this.emailService.sendMail({
          to: offer.requesterEmail,
          subject: accepted
            ? `✅ შენი ფასი დადასტურდა — ${offer.productName}`
            : `შენი შეთავაზება — ${offer.productName}`,
          html: this.requesterEmailHtml(offer, base, accepted),
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to notify requester of offer ${offer._id}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  private sellerEmailHtml(
    sellerName: string,
    productName: string,
    offer: PriceOfferDocument,
    base: string,
  ): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #ece7da;border-radius:14px;overflow:hidden">
        <div style="background:#012645;color:#fff;padding:20px 24px">
          <h2 style="margin:0;font-size:18px">💰 ახალი ფასის შეთავაზება</h2>
        </div>
        <div style="padding:24px;color:#1f2937">
          <p>გამარჯობა ${sellerName},</p>
          <p>თქვენს პროდუქტზე <strong>"${productName}"</strong> მიიღეთ ფასის შეთავაზება:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px 0;color:#6b7280">მიმდინარე ფასი</td><td style="text-align:right;font-weight:700">₾${offer.originalPrice}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">შემოთავაზებული ფასი</td><td style="text-align:right;font-weight:800;color:#bb9326">₾${offer.offeredPrice}</td></tr>
          </table>
          ${offer.message ? `<p style="background:#f8f9fb;padding:12px;border-radius:8px;color:#4b5563"><em>"${offer.message}"</em></p>` : ''}
          <p style="margin-top:20px">დაადასტურეთ ან უარყავით პასუხი თქვენი პროფილიდან:</p>
          <a href="${base}/profile?tab=offers" style="display:inline-block;background:linear-gradient(135deg,#012645,#02457a);color:#fff;text-decoration:none;padding:12px 28px;border-radius:100px;font-weight:700">შეთავაზებების ნახვა</a>
        </div>
      </div>`;
  }

  private adminEmailHtml(
    productName: string,
    sellerName: string,
    sellerEmail: string,
    offer: PriceOfferDocument,
    base: string,
  ): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ece7da;border-radius:14px;overflow:hidden">
        <div style="background:#012645;color:#fff;padding:20px 24px">
          <h2 style="margin:0;font-size:18px">💰 ახალი ფასის შეთავაზება (ადმინი)</h2>
        </div>
        <div style="padding:24px;color:#1f2937">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#6b7280">პროდუქტი</td><td style="text-align:right;font-weight:700">${productName}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">გამყიდველი</td><td style="text-align:right">${sellerName} (${sellerEmail})</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">მიმდინარე ფასი</td><td style="text-align:right">₾${offer.originalPrice}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">შემოთავაზებული</td><td style="text-align:right;font-weight:800;color:#bb9326">₾${offer.offeredPrice}</td></tr>
          </table>
          <h3 style="margin:18px 0 8px;font-size:14px;color:#012645">მყიდველის კონტაქტი (მხოლოდ ადმინისთვის)</h3>
          <table style="width:100%;border-collapse:collapse;background:#f8f9fb;border-radius:8px">
            <tr><td style="padding:8px 12px;color:#6b7280">სახელი</td><td style="text-align:right;padding:8px 12px">${offer.requesterName || '—'}</td></tr>
            <tr><td style="padding:8px 12px;color:#6b7280">იმეილი</td><td style="text-align:right;padding:8px 12px">${offer.requesterEmail || '—'}</td></tr>
            <tr><td style="padding:8px 12px;color:#6b7280">ტელეფონი</td><td style="text-align:right;padding:8px 12px;font-weight:700">${offer.requesterPhone || '—'}</td></tr>
          </table>
          ${offer.message ? `<p style="margin-top:14px;background:#f8f9fb;padding:12px;border-radius:8px;color:#4b5563"><em>"${offer.message}"</em></p>` : ''}
          <a href="${base}/admin/price-offers" style="display:inline-block;margin-top:18px;background:linear-gradient(135deg,#012645,#02457a);color:#fff;text-decoration:none;padding:11px 24px;border-radius:100px;font-weight:700">ადმინ პანელში ნახვა</a>
        </div>
      </div>`;
  }

  private requesterEmailHtml(
    offer: PriceOfferDocument,
    base: string,
    accepted: boolean,
  ): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #ece7da;border-radius:14px;overflow:hidden">
        <div style="background:#012645;color:#fff;padding:20px 24px">
          <h2 style="margin:0;font-size:18px">${accepted ? '✅ შენი ფასი დადასტურდა!' : 'შენი შეთავაზების პასუხი'}</h2>
        </div>
        <div style="padding:24px;color:#1f2937">
          <p>გამარჯობა ${offer.requesterName || ''},</p>
          ${
            accepted
              ? `<p>გილოცავთ! გამყიდველმა დაადასტურა თქვენი ფასი პროდუქტზე <strong>"${offer.productName}"</strong>.</p>
                 <p style="font-size:22px;font-weight:800;color:#bb9326;margin:16px 0">თქვენი ფასი: ₾${offer.offeredPrice}</p>
                 <p>ეს ფასი მოქმედებს მხოლოდ თქვენთვის — დაამატეთ პროდუქტი კალათაში და შეიძინეთ ამ ფასად.</p>
                 <a href="${base}/products/${offer.product.toString()}" style="display:inline-block;background:linear-gradient(180deg,#fdf6c9,#e7c75a 22%,#bb9326 55%,#8f6e18);color:#2a2208;text-decoration:none;padding:12px 28px;border-radius:100px;font-weight:800;margin-top:8px">პროდუქტზე გადასვლა</a>`
              : `<p>სამწუხაროდ, გამყიდველმა ვერ დაადასტურა თქვენი შეთავაზებული ფასი პროდუქტზე <strong>"${offer.productName}"</strong>.</p>
                 ${offer.sellerMessage ? `<p style="background:#f8f9fb;padding:12px;border-radius:8px;color:#4b5563"><em>"${offer.sellerMessage}"</em></p>` : ''}
                 <p>შეგიძლიათ სცადოთ ახალი შეთავაზება ან შეიძინოთ მიმდინარე ფასად.</p>`
          }
        </div>
      </div>`;
  }
}
