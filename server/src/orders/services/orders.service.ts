import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types, ClientSession } from 'mongoose';
import { PaymentResult, ShippingDetails } from 'src/interfaces';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Product, DeliveryType } from '../../products/schemas/product.schema';
import { User } from '../../users/schemas/user.schema';
import { ProductsService } from '@/products/services/products.service';
import { BalanceService } from '../../users/services/balance.service';
import { EmailService } from '../../email/services/email.services';
import {
  PushNotificationService,
  NotificationPayload,
} from '@/push/services/push-notification.service';
import { Role } from '@/types/role.enum';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SalesCommissionService } from '../../sales-commission/services/sales-commission.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(User.name) private userModel: Model<User>,
    private productsService: ProductsService,
    private balanceService: BalanceService,
    private emailService: EmailService,
    private readonly pushNotificationService: PushNotificationService,
    @InjectConnection() private connection: Connection,
    @Optional()
    @Inject(forwardRef(() => SalesCommissionService))
    private readonly salesCommissionService?: SalesCommissionService,
  ) {}

  private getPrimaryAppUrl(): string {
    const origins = process.env.ALLOWED_ORIGINS;
    if (!origins) {
      return 'https://soulart.ge';
    }

    const firstOrigin = origins
      .split(',')
      .map((value) => value.trim())
      .find((value) => value.length > 0);

    if (!firstOrigin) {
      return 'https://soulart.ge';
    }

    return firstOrigin.replace(/\/$/, '');
  }

  private getAdminEmail(): string {
    return process.env.ADMIN_NOTIFICATION_EMAIL || 'info@soulart.ge';
  }

  private formatShippingAddress(
    shippingDetails?: Partial<ShippingDetails>,
  ): string {
    if (!shippingDetails) {
      return '';
    }

    return [
      shippingDetails.address,
      shippingDetails.city,
      shippingDetails.postalCode,
      shippingDetails.country,
    ]
      .filter((value) => !!value)
      .join(', ');
  }

  private getDisplayName(
    user?: Partial<User> | any,
    fallback?: string,
  ): string {
    if (!user) {
      return fallback || 'მომხმარებელი';
    }

    const firstName = user.ownerFirstName || user.name;
    const lastName = user.ownerLastName;

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }

    if (firstName) {
      return firstName;
    }

    if (fallback) {
      return fallback;
    }

    return user.email || 'მომხმარებელი';
  }

  private normalizeDeliveryDays(value?: number | null): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }

    return Math.round(parsed);
  }

  private buildDeliveryEstimate(info?: {
    minDeliveryDays?: number | null;
    maxDeliveryDays?: number | null;
    deliveryType?: string | null;
  }): {
    label: string;
    minDays?: number;
    maxDays?: number;
    deliveryType?: string;
  } {
    const minDays = this.normalizeDeliveryDays(info?.minDeliveryDays);
    const maxDays = this.normalizeDeliveryDays(info?.maxDeliveryDays);
    const deliveryType = info?.deliveryType ?? undefined;

    if (minDays && maxDays) {
      if (minDays === maxDays) {
        return {
          label: `${minDays} სამუშაო დღე`,
          minDays,
          maxDays,
          deliveryType,
        };
      }

      return {
        label: `${minDays}-${maxDays} სამუშაო დღე`,
        minDays,
        maxDays,
        deliveryType,
      };
    }

    if (minDays) {
      return {
        label: `დაახლოებით ${minDays} სამუშაო დღე`,
        minDays,
        deliveryType,
      };
    }

    if (maxDays) {
      return {
        label: `მაქსიმუმ ${maxDays} სამუშაო დღე`,
        maxDays,
        deliveryType,
      };
    }

    if (deliveryType === DeliveryType.SELLER) {
      return {
        label: 'მიტანის ვადები იხილეთ შეკვეთების გვერდზე',
        deliveryType,
      };
    }

    if (deliveryType === DeliveryType.SoulArt) {
      return {
        label: 'SoulArt-ის სტანდარტული მიწოდება 1-3 სამუშაო დღე',
        deliveryType,
      };
    }

    return {
      label: 'მიტანის დეტალები დაზუსტდება შეკვეთის დამუშავებისას',
    };
  }

  private summarizeDeliveryWindow(
    windows: Array<{
      minDays?: number;
      maxDays?: number;
      deliveryType?: string;
    }>,
  ): string | undefined {
    if (!windows || windows.length === 0) {
      return undefined;
    }

    const minValues = windows
      .map((window) => window.minDays)
      .filter((value): value is number => typeof value === 'number');
    const maxValues = windows
      .map((window) => window.maxDays)
      .filter((value): value is number => typeof value === 'number');

    const minCombined =
      minValues.length > 0 ? Math.min(...minValues) : undefined;
    const maxCombined =
      maxValues.length > 0 ? Math.max(...maxValues) : undefined;

    if (minCombined !== undefined || maxCombined !== undefined) {
      if (
        minCombined !== undefined &&
        maxCombined !== undefined &&
        minCombined === maxCombined
      ) {
        return `${minCombined} სამუშაო დღე`;
      }

      if (minCombined !== undefined && maxCombined !== undefined) {
        return `${minCombined}-${maxCombined} სამუშაო დღე`;
      }

      if (minCombined !== undefined) {
        return `დაახლოებით ${minCombined} სამუშაო დღე`;
      }

      if (maxCombined !== undefined) {
        return `მაქსიმუმ ${maxCombined} სამუშაო დღე`;
      }
    }

    if (windows.some((window) => window.deliveryType === DeliveryType.SELLER)) {
      return 'მიტანის ვადებს ხელოვანი შეგითანხმებთ';
    }

    if (
      windows.some((window) => window.deliveryType === DeliveryType.SoulArt)
    ) {
      return 'SoulArt-ის სტანდარტული მიწოდება 1-3 სამუშაო დღე';
    }

    return undefined;
  }

  private resolveProductImageUrl(
    orderItem: any,
    productData: any,
    baseUrl: string,
  ): string | undefined {
    const sources: Array<string | undefined> = [];

    if (typeof orderItem?.image === 'string' && orderItem.image.trim().length) {
      sources.push(orderItem.image.trim());
    }

    if (Array.isArray(productData?.images)) {
      for (const image of productData.images) {
        if (typeof image === 'string' && image.trim().length) {
          sources.push(image.trim());
          break;
        }
      }
    }

    const rawSource = sources.find((value) => !!value);
    if (!rawSource) {
      return undefined;
    }

    if (/^https?:\/\//i.test(rawSource)) {
      return rawSource;
    }

    if (rawSource.startsWith('//')) {
      return `https:${rawSource}`;
    }

    try {
      return new URL(rawSource, baseUrl).toString();
    } catch {
      const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      return `${normalizedBase}${rawSource.replace(/^\//, '')}`;
    }
  }
  async create(
    orderAttrs: Partial<Order> & {
      salesRefCode?: string;
      totalReferralDiscount?: number;
      hasReferralDiscount?: boolean;
    },
    userId: string,
    externalOrderId?: string,
  ): Promise<OrderDocument> {
    const {
      orderItems,
      shippingDetails,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      salesRefCode,
      totalReferralDiscount,
      hasReferralDiscount,
    } = orderAttrs;
    if (orderItems && orderItems.length < 1)
      throw new BadRequestException('No order items received.');
    // Start MongoDB transaction to prevent race conditions
    const session = await this.connection.startSession();
    try {
      const createdOrder = await session.withTransaction(async () => {
        // First, validate and reserve stock for all items ATOMICALLY
        for (const item of orderItems) {
          const product = await this.productModel
            .findById(item.productId)
            .session(session);
          if (!product) {
            throw new NotFoundException(
              `Product with ID ${item.productId} not found`,
            );
          }
          // Check and reserve stock atomically
          if (
            product.variants &&
            product.variants.length > 0 &&
            (item.size || item.color || item.ageGroup)
          ) {
            // Find the specific variant
            const variantIndex = product.variants.findIndex(
              (v) =>
                v.size === item.size &&
                v.color === item.color &&
                v.ageGroup === item.ageGroup,
            );
            if (variantIndex === -1) {
              throw new BadRequestException(
                `Variant not found for product ${product.name} (${item.size}/${item.color}/${item.ageGroup})`,
              );
            }
            if (product.variants[variantIndex].stock < item.qty) {
              throw new BadRequestException(
                `Not enough stock for product ${product.name} variant (${item.size}/${item.color}/${item.ageGroup}). Available: ${product.variants[variantIndex].stock}, Requested: ${item.qty}`,
              );
            }
            // Reserve stock immediately (subtract from available stock)
            product.variants[variantIndex].stock -= item.qty;
          } else if (
            product.variants &&
            product.variants.length > 0 &&
            !item.size &&
            !item.color &&
            !item.ageGroup
          ) {
            // Handle products with variants but no size/color/ageGroup specified
            // Check if variants have no attributes (just stock)
            const hasNoAttributes = product.variants.every(
              (v) => !v.size && !v.color && !v.ageGroup,
            );
            if (hasNoAttributes) {
              // Use the first variant's stock
              if (product.variants[0].stock < item.qty) {
                throw new BadRequestException(
                  `Not enough stock for product ${product.name}. Available: ${product.variants[0].stock}, Requested: ${item.qty}`,
                );
              }
              product.variants[0].stock -= item.qty;
            } else {
              // Fall back to countInStock
              if (product.countInStock < item.qty) {
                throw new BadRequestException(
                  `Not enough stock for product ${product.name}. Available: ${product.countInStock}, Requested: ${item.qty}`,
                );
              }
              product.countInStock -= item.qty;
            }
          } else {
            // Handle legacy products without variants
            if (product.countInStock < item.qty) {
              throw new BadRequestException(
                `Not enough stock for product ${product.name}. Available: ${product.countInStock}, Requested: ${item.qty}`,
              );
            }
            // Reserve stock immediately
            product.countInStock -= item.qty;
          }
          // Save the product with updated stock within the transaction
          await product.save({ session });
        }
        // Now create the order (stock is already reserved)
        const enhancedOrderItems = await Promise.all(
          orderItems.map(async (item) => {
            const product = await this.productModel
              .findById(item.productId)
              .session(session);
            if (!product) {
              throw new NotFoundException(
                `Product with ID ${item.productId} not found`,
              );
            }
            return {
              ...item,
              // Ensure size, color, and ageGroup are included from the order item
              size: item.size || '',
              color: item.color || '',
              ageGroup: item.ageGroup || '',
              product: {
                _id: product._id,
                name: product.name,
                nameEn: product.nameEn,
                deliveryType: product.deliveryType,
                minDeliveryDays: product.minDeliveryDays,
                maxDeliveryDays: product.maxDeliveryDays,
                dimensions: product.dimensions
                  ? {
                      width: product.dimensions.width,
                      height: product.dimensions.height,
                      depth: product.dimensions.depth,
                    }
                  : undefined,
              },
            };
          }),
        );
        const createdOrder = await this.orderModel.create(
          [
            {
              user: userId,
              orderItems: enhancedOrderItems,
              shippingDetails,
              paymentMethod,
              itemsPrice,
              taxPrice,
              shippingPrice,
              totalPrice,
              externalOrderId,
              salesRefCode: salesRefCode || null,
              totalReferralDiscount: totalReferralDiscount || 0,
              hasReferralDiscount: hasReferralDiscount || false,
              stockReservationExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
            },
          ],
          { session },
        );
        return createdOrder[0];
      });

      return createdOrder;
    } finally {
      await session.endSession();
    }
  }

  async createGuestOrder(
    orderAttrs: Partial<Order> & {
      guestInfo: { email: string; phoneNumber: string; fullName: string };
      salesRefCode?: string;
      totalReferralDiscount?: number;
      hasReferralDiscount?: boolean;
    },
    externalOrderId?: string,
  ): Promise<OrderDocument> {
    const {
      orderItems,
      shippingDetails,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      guestInfo,
      salesRefCode,
      totalReferralDiscount,
      hasReferralDiscount,
    } = orderAttrs;

    if (orderItems && orderItems.length < 1)
      throw new BadRequestException('No order items received.');

    // Validate guest info
    if (
      !guestInfo ||
      !guestInfo.email ||
      !guestInfo.phoneNumber ||
      !guestInfo.fullName
    ) {
      throw new BadRequestException(
        'Guest checkout requires email, phoneNumber, and fullName',
      );
    }

    // Start MongoDB transaction to prevent race conditions
    const session = await this.connection.startSession();
    try {
      const createdOrder = await session.withTransaction(async () => {
        // First, validate and reserve stock for all items ATOMICALLY
        for (const item of orderItems) {
          const product = await this.productModel
            .findById(item.productId)
            .session(session);

          if (!product) {
            throw new NotFoundException(
              `Product with ID ${item.productId} not found`,
            );
          }

          // Check and reserve stock atomically
          if (product.variants && product.variants.length > 0) {
            // Check if this product has variants with specific attributes (size/color/ageGroup)
            const hasVariantAttributes =
              item.size || item.color || item.ageGroup;

            if (hasVariantAttributes) {
              // Find the specific variant
              const variantIndex = product.variants.findIndex(
                (v) =>
                  v.size === item.size &&
                  v.color === item.color &&
                  v.ageGroup === item.ageGroup,
              );

              if (variantIndex === -1) {
                throw new BadRequestException(
                  `Variant not found for product ${product.name} (${item.size}/${item.color}/${item.ageGroup})`,
                );
              }

              if (product.variants[variantIndex].stock < item.qty) {
                throw new BadRequestException(
                  `Not enough stock for product ${product.name} variant (${item.size}/${item.color}/${item.ageGroup}). Available: ${product.variants[variantIndex].stock}, Requested: ${item.qty}`,
                );
              }

              // Reserve stock immediately (subtract from available stock)
              product.variants[variantIndex].stock -= item.qty;
            } else {
              // Product has variants but no specific attributes - use first variant
              if (product.variants[0].stock < item.qty) {
                throw new BadRequestException(
                  `Not enough stock for product ${product.name}. Available: ${product.variants[0].stock}, Requested: ${item.qty}`,
                );
              }

              // Reserve stock from first variant
              product.variants[0].stock -= item.qty;
            }
          } else {
            // Handle legacy products without variants
            if (product.countInStock < item.qty) {
              throw new BadRequestException(
                `Not enough stock for product ${product.name}. Available: ${product.countInStock}, Requested: ${item.qty}`,
              );
            }

            // Reserve stock immediately
            product.countInStock -= item.qty;
          }

          // Save the product with updated stock within the transaction
          await product.save({ session });
        }

        // Now create the order (stock is already reserved)
        const enhancedOrderItems = await Promise.all(
          orderItems.map(async (item) => {
            const product = await this.productModel
              .findById(item.productId)
              .session(session);

            if (!product) {
              throw new NotFoundException(
                `Product with ID ${item.productId} not found`,
              );
            }

            return {
              ...item,
              // Ensure size, color, and ageGroup are included from the order item
              size: item.size || '',
              color: item.color || '',
              ageGroup: item.ageGroup || '',
              product: {
                _id: product._id,
                name: product.name,
                nameEn: product.nameEn,
                deliveryType: product.deliveryType,
                minDeliveryDays: product.minDeliveryDays,
                maxDeliveryDays: product.maxDeliveryDays,
                dimensions: product.dimensions
                  ? {
                      width: product.dimensions.width,
                      height: product.dimensions.height,
                      depth: product.dimensions.depth,
                    }
                  : undefined,
              },
            };
          }),
        );

        const createdOrder = await this.orderModel.create(
          [
            {
              user: null, // No user for guest orders
              guestInfo, // Store guest information
              isGuestOrder: true,
              orderItems: enhancedOrderItems,
              shippingDetails,
              paymentMethod,
              itemsPrice,
              taxPrice,
              shippingPrice,
              totalPrice,
              externalOrderId,
              salesRefCode: salesRefCode || null,
              totalReferralDiscount: totalReferralDiscount || 0,
              hasReferralDiscount: hasReferralDiscount || false,
              stockReservationExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
            },
          ],
          { session },
        );

        return createdOrder[0];
      });

      return createdOrder;
    } finally {
      await session.endSession();
    }
  }

  async findAll(orderType?: string): Promise<any[]> {
    // Build filter based on orderType
    const filter: FilterQuery<Order> = {};
    if (orderType === 'auction') {
      filter.orderType = 'auction';
    } else if (orderType === 'regular') {
      filter.$or = [
        { orderType: 'regular' },
        { orderType: { $exists: false } },
      ];
    }
    // If no orderType specified, return all orders

    // Sort by createdAt in descending order (newest first)
    const orders = await this.orderModel
      .find(filter)
      .populate('user', 'name email phoneNumber')
      .populate({
        path: 'orderItems.productId',
        select: 'name user deliveryType minDeliveryDays maxDeliveryDays brand',
        populate: {
          path: 'user',
          select: '_id name email phoneNumber storeName',
        },
      })
      .populate({
        path: 'auctionId',
        select: 'title mainImage seller currentWinner',
        populate: {
          path: 'seller',
          select: '_id name email phoneNumber storeName',
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Add sales manager info for orders with salesRefCode
    const salesRefCodes = [
      ...new Set(
        orders.filter((o) => o.salesRefCode).map((o) => o.salesRefCode),
      ),
    ];

    if (salesRefCodes.length > 0) {
      const salesManagers = await this.userModel
        .find(
          { salesRefCode: { $in: salesRefCodes } },
          { salesRefCode: 1, name: 1, email: 1 },
        )
        .lean();

      const salesManagerMap = new Map(
        salesManagers.map((sm) => [sm.salesRefCode, sm]),
      );

      return orders.map((order) => ({
        ...order,
        salesManager: order.salesRefCode
          ? salesManagerMap.get(order.salesRefCode) || null
          : null,
      }));
    }

    return orders;
  }
  async findById(id: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid order ID.');
    const order = await this.orderModel
      .findById(id)
      .populate('user', 'name email phoneNumber')
      .populate({
        path: 'auctionId',
        select: 'title mainImage seller',
        populate: {
          path: 'seller',
          select: '_id name email phoneNumber storeName',
        },
      });
    if (!order) throw new NotFoundException('No order with given ID.');
    return order;
  }

  /**
   * Link all guest orders with a specific email to a newly registered user
   * This is called when a guest user registers with their email
   */
  async linkGuestOrdersByEmail(
    email: string,
    userId: string,
  ): Promise<{ linkedCount: number }> {
    try {
      if (!email || !userId) {
        throw new BadRequestException('Email and userId are required');
      }

      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }

      const lowercaseEmail = email.toLowerCase();

      // Find all guest orders with this email
      const guestOrders = await this.orderModel.find({
        isGuestOrder: true,
        'guestInfo.email': lowercaseEmail,
      });

      if (guestOrders.length === 0) {
        this.logger.log(`No guest orders found for email: ${lowercaseEmail}`);
        return { linkedCount: 0 };
      }

      // Update all guest orders to link them to the user
      const result = await this.orderModel.updateMany(
        {
          isGuestOrder: true,
          'guestInfo.email': lowercaseEmail,
        },
        {
          $set: {
            user: new Types.ObjectId(userId),
            isGuestOrder: false,
          },
          $unset: {
            guestInfo: '',
          },
        },
      );

      this.logger.log(
        `Linked ${result.modifiedCount} guest orders to user ${userId} (email: ${lowercaseEmail})`,
      );

      return { linkedCount: result.modifiedCount };
    } catch (error: any) {
      this.logger.error(
        `Failed to link guest orders: ${error.message}`,
        error.stack,
      );
      // Don't throw error - we don't want to fail user registration if order linking fails
      return { linkedCount: 0 };
    }
  }

  async updatePaid(
    id: string,
    paymentResult: PaymentResult,
  ): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid order ID.');
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('No order with given ID.');
    // Check if order is already paid
    if (order.isPaid) {
      throw new BadRequestException('Order is already paid.');
    }
    // შეამოწმოს თუ შეკვეთა cancelled სტატუსშია, მაშინ არ დაუშვას გადახდა
    if (order.status === 'cancelled') {
      throw new BadRequestException(
        'Cannot pay for cancelled order. Please create a new order.',
      );
    }
    // თუ სტოკის რეზერვაცია ამოიწურა, მაგრამ გადახდა მოდის, პირდაპირ შევცვალოთ სტატუსი
    // ეს ხდება იმ შემთხვევაში თუ მომხმარებელმა წარმატებით გადაიხადა საბანკო სისტემაში
    const isExpired =
      order.stockReservationExpires &&
      new Date() > order.stockReservationExpires;
    if (isExpired) {
      // თუ რეზერვაცია ამოიწურა, მაგრამ გადახდა მოვიდა, მაინც შევცვალოთ სტატუსი გადახდილში
      this.logger?.log(
        `Payment received for expired reservation order ${id}. Processing payment anyway.`,
      );
    }
    // შევამოწმოთ სტოკი მხოლოდ იმ შემთხვევაში თუ რეზერვაცია არ ამოიწურა
    if (!isExpired) {
      // Validate that stock is still available for all order items
      for (const item of order.orderItems) {
        const product = await this.productModel.findById(item.productId);
        if (!product) {
          throw new NotFoundException(
            `Product ${item.name} is no longer available.`,
          );
        }
        // Check stock availability
        let stockAvailable = false;
        if (
          product.variants &&
          product.variants.length > 0 &&
          (item.size || item.color || item.ageGroup)
        ) {
          // Check variant stock
          const variant = product.variants.find(
            (v) =>
              v.size === item.size &&
              v.color === item.color &&
              v.ageGroup === item.ageGroup,
          );
          if (variant && variant.stock >= 0) {
            stockAvailable = true;
          }
        } else {
          // Check general stock
          if (product.countInStock >= 0) {
            stockAvailable = true;
          }
        }
        if (!stockAvailable) {
          throw new BadRequestException(
            `Product "${item.name}" ${item.size ? `(${item.size}/${item.color}/${item.ageGroup})` : ''} is no longer available. Stock has been exhausted.`,
          );
        }
      }
    }
    order.isPaid = true;
    order.paidAt = Date();
    order.paymentResult = paymentResult;
    order.status = 'paid'; // Update status to paid
    // Remove stock reservation expiration since payment is completed
    order.stockReservationExpires = undefined;
    // Note: Stock is already reduced during order creation
    // No need to reduce stock again here to prevent double reduction
    const updatedOrder = await order.save();

    // Sales Manager კომისიის შექმნა (თუ არის salesRefCode)
    this.logger.log(
      `[SalesCommission] Checking: salesRefCode=${order.salesRefCode}, hasService=${!!this.salesCommissionService}`,
    );
    if (order.salesRefCode && this.salesCommissionService) {
      try {
        this.logger.log(
          `[SalesCommission] Creating commission for order ${id} with ref ${order.salesRefCode}`,
        );
        await this.salesCommissionService.processOrderCommission(
          id,
          order.salesRefCode,
        );
        this.logger.log(
          `[SalesCommission] SUCCESS: Commission created for order ${id}`,
        );
      } catch (error) {
        this.logger.error(
          `[SalesCommission] FAILED for order ${id}: ${error.message}`,
        );
      }
    } else {
      this.logger.warn(
        `[SalesCommission] SKIPPED: No salesRefCode or no service for order ${id}`,
      );
    }

    try {
      await this.sendOrderPaidNotifications(updatedOrder._id.toString());
    } catch (error) {
      this.logger.error(
        `Failed to dispatch post-payment notifications for order ${id}: ${error.message}`,
        error.stack,
      );
    }

    return updatedOrder;
  }
  async updateDelivered(id: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid order ID.');
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('No order with given ID.');

    // Prevent duplicate delivery processing
    if (order.isDelivered) {
      this.logger.warn(`Order ${id} is already marked as delivered. Skipping.`);
      return order;
    }

    order.isDelivered = true;
    order.deliveredAt = Date();
    order.status = 'delivered'; // Update status to delivered
    const updatedOrder = await order.save();

    // სელერის ბალანსის განახლება როდესაც შეკვეთა მიტანილია
    try {
      await this.balanceService.processOrderEarnings(updatedOrder);
      this.logger.log(`Balance processed for delivered order: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to process balance for order ${id}:`, error);
    }

    // Sales Manager კომისიის დამტკიცება (თუ არის)
    if (this.salesCommissionService) {
      try {
        await this.salesCommissionService.approveCommission(id);
        this.logger.log(`Sales commission approved for delivered order: ${id}`);
      } catch (error) {
        this.logger.error(
          `Failed to approve sales commission for order ${id}: ${error.message}`,
        );
      }
    }

    // Send delivery confirmation email to customer
    try {
      const orderWithData = await this.orderModel
        .findById(id)
        .populate('user', 'email ownerFirstName ownerLastName name')
        .populate({
          path: 'orderItems.productId',
          select: 'user brand',
          populate: {
            path: 'user',
            select:
              'storeName brandName artistSlug ownerFirstName ownerLastName email',
          },
        })
        .populate({
          path: 'auctionId',
          select: 'title mainImage seller',
          populate: {
            path: 'seller',
            select:
              'storeName brandName artistSlug ownerFirstName ownerLastName email',
          },
        });

      // Get customer email - check guest order first
      const customerEmail =
        orderWithData?.isGuestOrder && orderWithData?.guestInfo?.email
          ? orderWithData.guestInfo.email
          : orderWithData?.user?.email;

      // Get customer name - check guest order first
      const customerName =
        orderWithData?.isGuestOrder && orderWithData?.guestInfo?.fullName
          ? orderWithData.guestInfo.fullName
          : `${orderWithData?.user?.ownerFirstName || ''} ${orderWithData?.user?.ownerLastName || ''}`.trim() ||
            orderWithData?.user?.name ||
            'მყიდველო';

      // Check if this is an auction order
      const isAuctionOrder =
        orderWithData.orderType === 'auction' && orderWithData.auctionId;

      let orderItemsForEmail: Array<{ name: string; quantity: number }> = [];
      let artists: Array<{ name: string; slug: string }> = [];
      let auctionImage: string | undefined;

      if (isAuctionOrder) {
        // For auction orders, use auction data
        const auction = orderWithData.auctionId as any;
        orderItemsForEmail = [
          {
            name: auction.title || 'აუქციონის ნახატი',
            quantity: 1,
          },
        ];
        auctionImage = auction.mainImage;

        // Get seller info from auction
        const seller = auction.seller;
        if (seller?.artistSlug) {
          artists = [
            {
              name:
                seller.brandName ||
                seller.storeName ||
                `${seller.ownerFirstName || ''} ${seller.ownerLastName || ''}`.trim() ||
                'ხელოვანი',
              slug: seller.artistSlug,
            },
          ];
        }

        // Send delivery notification to auction seller
        if (seller?.email) {
          try {
            await this.emailService.sendAuctionDeliveryConfirmationToSeller(
              seller.email,
              auction.title,
              customerName,
              auctionImage,
            );
          } catch (error) {
            this.logger.error(
              `Failed to send auction delivery email to seller: ${error.message}`,
            );
          }
        }
      } else {
        // For regular orders
        orderItemsForEmail = orderWithData.orderItems.map((item) => ({
          name: item.name,
          quantity: item.qty,
        }));

        // Get unique artists from order items
        const artistsMap = new Map<string, { name: string; slug: string }>();

        for (const item of orderWithData.orderItems) {
          const productData: any = item.productId;
          const seller = productData?.user;

          // Get seller name for email
          const sellerName =
            seller?.brandName ||
            seller?.storeName ||
            `${seller?.ownerFirstName || ''} ${seller?.ownerLastName || ''}`.trim() ||
            'ხელოვანი';

          if (seller?.artistSlug) {
            if (!artistsMap.has(seller.artistSlug)) {
              artistsMap.set(seller.artistSlug, {
                name: sellerName,
                slug: seller.artistSlug,
              });
            }
          }

          // Send delivery notification to each seller
          if (seller?.email) {
            try {
              await this.emailService.sendDeliveryNotificationToSeller(
                seller.email,
                sellerName,
                orderWithData._id.toString(),
                [{ name: item.name, quantity: item.qty }],
              );
            } catch (error) {
              this.logger.error(
                `Failed to send delivery email to seller ${seller.email}: ${error.message}`,
              );
            }
          }
        }

        artists = Array.from(artistsMap.values());
      }

      // Send delivery confirmation to customer
      if (customerEmail) {
        await this.emailService.sendDeliveryConfirmation(
          customerEmail,
          customerName,
          orderWithData._id.toString(),
          orderItemsForEmail,
          artists,
          auctionImage,
        );
      }
    } catch (error) {
      this.logger.error('Failed to send delivery confirmation email:', error);
      // Don't throw error for email failures
    }

    return updatedOrder;
  }
  async findUserOrders(userId: string) {
    // Sort by createdAt in descending order (newest first)
    const orders = await this.orderModel
      .find({ user: userId })
      .populate('auctionId', 'title mainImage seller')
      .sort({ createdAt: -1 });
    return orders;
  }
  async findByExternalOrderId(externalOrderId: string): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({ externalOrderId });
    if (!order) {
      throw new NotFoundException(
        `Order with external ID ${externalOrderId} not found`,
      );
    }
    return order;
  }
  async updateOrderByExternalId(
    externalOrderId: string,
    paymentResult: PaymentResult,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({ externalOrderId });
    if (!order) {
      throw new NotFoundException(
        `Order with external ID ${externalOrderId} not found`,
      );
    }
    console.log(
      `Found order: ${order._id}, current isPaid: ${order.isPaid}, current status: ${order.status}`,
    );
    // Check if order is already paid
    if (order.isPaid) {
      throw new BadRequestException('Order is already paid.');
    }
    // შეამოწმოს თუ შეკვეთა cancelled სტატუსშია, მაშინ არ დაუშვას გადახდა
    if (order.status === 'cancelled') {
      throw new BadRequestException(
        'Cannot pay for cancelled order. Please create a new order.',
      );
    }
    // თუ სტოკის რეზერვაცია ამოიწურა, მაგრამ გადახდა მოდის, პირდაპირ შევცვალოთ სტატუსი
    const isExpired =
      order.stockReservationExpires &&
      new Date() > order.stockReservationExpires;
    if (isExpired) {
      // თუ რეზერვაცია ამოიწურა, მაგრამ გადახდა მოვიდა, მაინც შევცვალოთ სტატუსი გადახდილში
      this.logger.log(
        `Payment received for expired reservation order ${externalOrderId}. Processing payment anyway.`,
      );
    }
    // შევამოწმოთ სტოკი მხოლოდ იმ შემთხვევაში თუ რეზერვაცია არ ამოიწურა
    if (!isExpired) {
      // Validate that reserved stock is still valid (stock should be >= 0 after initial reservation)
      for (const item of order.orderItems) {
        const product = await this.productModel.findById(item.productId);
        if (!product) {
          throw new NotFoundException(
            `Product ${item.name} is no longer available.`,
          );
        }
        // Check if stock went negative (shouldn't happen with our system, but safety check)
        let stockValid = false;
        if (
          product.variants &&
          product.variants.length > 0 &&
          (item.size || item.color || item.ageGroup)
        ) {
          const variant = product.variants.find(
            (v) =>
              v.size === item.size &&
              v.color === item.color &&
              v.ageGroup === item.ageGroup,
          );
          if (variant && variant.stock >= 0) {
            stockValid = true;
          }
        } else {
          if (product.countInStock >= 0) {
            stockValid = true;
          }
        }
        if (!stockValid) {
          throw new BadRequestException(
            `Product "${item.name}" stock integrity issue.`,
          );
        }
      }
    }
    order.isPaid = true;
    order.paidAt = new Date().toISOString();
    order.paymentResult = paymentResult;
    order.status = 'paid'; // Update status to paid
    // Remove stock reservation expiration since payment is completed
    order.stockReservationExpires = undefined;
    // Note: Stock is already reduced during order creation
    // No need to reduce stock again here to prevent double reduction
    const updatedOrder = await order.save();
    console.log(
      `Order ${externalOrderId} successfully updated. New isPaid: ${updatedOrder.isPaid}, new status: ${updatedOrder.status}`,
    );

    // Sales Manager კომისიის შექმნა (თუ არის salesRefCode)
    this.logger.log(
      `[SalesCommission] Checking in updateOrderByExternalId: salesRefCode=${order.salesRefCode}, hasService=${!!this.salesCommissionService}`,
    );
    if (order.salesRefCode && this.salesCommissionService) {
      try {
        this.logger.log(
          `[SalesCommission] Creating commission for order ${order._id} with ref ${order.salesRefCode}`,
        );
        await this.salesCommissionService.processOrderCommission(
          order._id.toString(),
          order.salesRefCode,
        );
        this.logger.log(
          `[SalesCommission] SUCCESS: Commission created for order ${order._id}`,
        );
      } catch (error) {
        this.logger.error(
          `[SalesCommission] FAILED for order ${order._id}: ${error.message}`,
        );
      }
    } else {
      this.logger.warn(
        `[SalesCommission] SKIPPED: No salesRefCode or no service for order ${order._id}`,
      );
    }

    try {
      await this.sendOrderPaidNotifications(updatedOrder._id.toString());
    } catch (error) {
      this.logger.error(
        `Failed to dispatch post-payment notifications for external order ${externalOrderId}: ${error.message}`,
        error.stack,
      );
    }

    return updatedOrder;
  }

  async updateOrderPaymentInfo(
    orderId: string,
    paymentInfo: {
      id: string;
      status: string;
      update_time: string;
      paymentMethod?: string;
    },
  ): Promise<void> {
    const order = await this.orderModel.findById(orderId);
    if (order) {
      order.paymentResult = {
        ...paymentInfo,
        email_address: 'pending@payment.com',
      };
      // Store PayPal order ID in payment field for capture
      if (paymentInfo.paymentMethod) {
        order.payment = {
          id: paymentInfo.id,
          status: paymentInfo.status,
          paymentMethod: paymentInfo.paymentMethod,
        };
      }
      await order.save();
      console.log(`Updated order ${orderId} with payment info:`, paymentInfo);
    }
  }

  private async sendOrderPaidNotifications(orderId: string): Promise<void> {
    try {
      const orderWithData: any = await this.orderModel
        .findById(orderId)
        .populate({
          path: 'user',
          select: '_id email name ownerFirstName ownerLastName phoneNumber',
        })
        .populate({
          path: 'orderItems.productId',
          select:
            'name user images deliveryType minDeliveryDays maxDeliveryDays',
          populate: {
            path: 'user',
            select:
              '_id email name ownerFirstName ownerLastName phoneNumber storeName',
          },
        })
        .lean();

      if (!orderWithData) {
        this.logger.warn(
          `Order ${orderId} not found while preparing notification payloads`,
        );
        return;
      }

      const customerName =
        orderWithData.isGuestOrder && orderWithData.guestInfo?.fullName
          ? orderWithData.guestInfo.fullName
          : this.getDisplayName(orderWithData.user);
      const customerEmail =
        orderWithData.isGuestOrder && orderWithData.guestInfo?.email
          ? orderWithData.guestInfo.email
          : orderWithData.user?.email;
      const customerPhone =
        orderWithData.isGuestOrder && orderWithData.guestInfo?.phoneNumber
          ? orderWithData.guestInfo.phoneNumber
          : orderWithData.user?.phoneNumber;
      const shippingDetails = (orderWithData.shippingDetails ??
        {}) as Partial<ShippingDetails>;
      const baseUrl = this.getPrimaryAppUrl();
      const totals = {
        itemsPrice: orderWithData.itemsPrice ?? 0,
        shippingPrice: orderWithData.shippingPrice ?? 0,
        taxPrice: orderWithData.taxPrice ?? 0,
        totalPrice: orderWithData.totalPrice ?? 0,
      };
      const customerContactPhone =
        shippingDetails?.phoneNumber || customerPhone || undefined;
      const customerOrderItems = orderWithData.orderItems.map((item: any) => {
        const populatedProduct =
          item.productId && typeof item.productId === 'object'
            ? (item.productId as any)
            : undefined;

        const deliveryEstimate = this.buildDeliveryEstimate({
          deliveryType:
            item.product?.deliveryType ?? populatedProduct?.deliveryType,
          minDeliveryDays:
            item.product?.minDeliveryDays ?? populatedProduct?.minDeliveryDays,
          maxDeliveryDays:
            item.product?.maxDeliveryDays ?? populatedProduct?.maxDeliveryDays,
        });

        const variantDetails = [item.size, item.color, item.ageGroup]
          .filter((value) => !!value)
          .join(' • ');

        return {
          name: item.name,
          quantity: item.qty,
          price: item.price,
          subtotal: (item.price || 0) * (item.qty || 0),
          variantDetails: variantDetails || undefined,
          delivery: deliveryEstimate,
          imageUrl: this.resolveProductImageUrl(
            item,
            populatedProduct,
            baseUrl,
          ),
        };
      });
      const deliverySummary = this.summarizeDeliveryWindow(
        customerOrderItems.map((item) => item.delivery),
      );
      const shippingAddressText =
        this.formatShippingAddress(shippingDetails) ||
        'მისამართი არ არის მითითებული';

      if (customerEmail) {
        try {
          const emailPayload: any = {
            customerName,
            orderId,
            profileUrl: `${baseUrl}/profile/orders`,
            shippingAddress: shippingAddressText,
            contactPhone: customerContactPhone,
            totals,
            deliverySummary,
            placedAt: orderWithData.createdAt,
            orderItems: customerOrderItems,
          };

          // For guest orders, include direct order details URL
          if (orderWithData.isGuestOrder) {
            emailPayload.orderDetailsUrl = `${baseUrl}/orders/${orderId}`;
          }

          await this.emailService.sendOrderConfirmation(
            customerEmail,
            emailPayload,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send customer confirmation email for order ${orderId}: ${error.message}`,
            error.stack,
          );
        }
      }

      if (orderWithData.user?._id) {
        try {
          const buyerPayload: NotificationPayload = {
            title: '🎉 შეკვეთა წარმატებით დადასტურდა',
            body: `#${orderId} • ${orderWithData.orderItems.length} პროდუქტი • ${totals.totalPrice.toFixed(
              2,
            )} ₾`,
            icon: `${baseUrl}/icons/android/icon-192x192.png`,
            badge: `${baseUrl}/icons/pwa/notification-badge.png`,
            data: {
              url: `${baseUrl}/profile/orders/${orderId}`,
              type: 'order_status',
              id: orderId,
            },
            tag: `order-success-${orderId}-buyer`,
            requireInteraction: false,
          };

          await this.pushNotificationService.sendToUser(
            orderWithData.user._id.toString(),
            buyerPayload,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send push notification to buyer for order ${orderId}: ${error.message}`,
            error.stack,
          );
        }
      }

      const sellerItemsMap = new Map<
        string,
        {
          seller: any;
          items: Array<{
            name: string;
            quantity: number;
            price: number;
            size?: string;
            color?: string;
            ageGroup?: string;
            subtotal: number;
            imageUrl?: string;
          }>;
          subtotal: number;
          hasSellerDelivery: boolean; // true if any product has SELLER delivery type
        }
      >();

      for (const item of orderWithData.orderItems) {
        const productData: any = item.productId;
        let sellerData: any = productData?.user;

        if (sellerData && typeof sellerData === 'object' && !sellerData._id) {
          sellerData._id = productData.user?._id;
        }

        if (!sellerData || typeof sellerData === 'string') {
          const sellerIdCandidate =
            typeof sellerData === 'string'
              ? sellerData
              : productData?.user?._id?.toString?.();
          if (sellerIdCandidate && Types.ObjectId.isValid(sellerIdCandidate)) {
            sellerData = await this.userModel
              .findById(sellerIdCandidate)
              .select(
                '_id email name ownerFirstName ownerLastName phoneNumber storeName',
              )
              .lean();
          }
        }

        if (!sellerData || !sellerData._id) {
          continue;
        }

        const sellerId = sellerData._id.toString();
        const isSellerDelivery = String(productData?.deliveryType) === 'SELLER';
        const summaryItem = {
          name: item.name,
          quantity: item.qty,
          price: item.price,
          size: item.size || undefined,
          color: item.color || undefined,
          ageGroup: item.ageGroup || undefined,
          subtotal: (item.price || 0) * (item.qty || 0),
          imageUrl: this.resolveProductImageUrl(item, productData, baseUrl),
        };

        if (!sellerItemsMap.has(sellerId)) {
          sellerItemsMap.set(sellerId, {
            seller: sellerData,
            items: [],
            subtotal: 0,
            hasSellerDelivery: false,
          });
        }

        const entry = sellerItemsMap.get(sellerId)!;
        entry.items.push(summaryItem);
        entry.subtotal += summaryItem.subtotal;
        entry.seller = sellerData;
        // If any product has SELLER delivery, the seller needs shipping info
        if (isSellerDelivery) {
          entry.hasSellerDelivery = true;
        }
      }
      await Promise.all(
        Array.from(sellerItemsMap.entries()).map(async ([sellerId, entry]) => {
          const sellerEmail = entry.seller?.email;
          if (sellerEmail) {
            try {
              // Only include phone and address if seller handles delivery (SELLER deliveryType)
              const includeShippingInfo = entry.hasSellerDelivery;

              await this.emailService.sendNewOrderNotificationToSeller(
                sellerEmail,
                this.getDisplayName(
                  entry.seller,
                  entry.seller?.storeName || 'ხელოვანი',
                ),
                {
                  orderId,
                  customerName,
                  customerEmail,
                  // Only include phone and address if seller handles delivery
                  customerPhone: includeShippingInfo
                    ? customerPhone
                    : undefined,
                  shippingAddress: includeShippingInfo
                    ? shippingDetails
                    : undefined,
                  paymentMethod: orderWithData.paymentMethod,
                  totals: {
                    ...totals,
                    // სელერისთვის: totalPrice - shippingPrice (მიტანის გარეშე)
                    // რადგან საკომისიო პროდუქტის ფასიდან იანგარიშება
                    sellerSubtotal:
                      (totals.totalPrice || 0) - (totals.shippingPrice || 0),
                  },
                  orderItems: entry.items,
                },
              );
            } catch (error) {
              this.logger.error(
                `Failed to send seller email for order ${orderId} (seller ${sellerId}): ${error.message}`,
                error.stack,
              );
            }
          } else {
            this.logger.warn(
              `Seller ${sellerId} has no email configured. Skipping email notification for order ${orderId}.`,
            );
          }

          try {
            // სელერისთვის: totalPrice - shippingPrice
            const sellerDisplayTotal =
              (totals.totalPrice || 0) - (totals.shippingPrice || 0);
            const sellerPayload: NotificationPayload = {
              title: '🛒 ახალი შეკვეთა',
              body: `${entry.items.length} პროდუქტი • ${sellerDisplayTotal.toFixed(
                2,
              )} ₾`,
              icon: `${baseUrl}/icons/android/icon-192x192.png`,
              badge: `${baseUrl}/icons/pwa/notification-badge.png`,
              data: {
                url: `${baseUrl}/admin/orders/${orderId}`,
                type: 'order_status',
                id: orderId,
              },
              tag: `order-paid-${orderId}-${sellerId}`,
              requireInteraction: true,
            };

            await this.pushNotificationService.sendToUser(
              sellerId,
              sellerPayload,
            );
          } catch (error) {
            this.logger.error(
              `Failed to send push notification to seller ${sellerId} for order ${orderId}: ${error.message}`,
              error.stack,
            );
          }
        }),
      );

      const adminEmail = this.getAdminEmail();
      const adminItems = orderWithData.orderItems.map((item: any) => {
        const productData: any = item.productId;
        const sellerData: any = productData?.user;

        const sellerInfo =
          sellerData && typeof sellerData === 'object'
            ? {
                name: this.getDisplayName(
                  sellerData,
                  sellerData.storeName || sellerData.name,
                ),
                email: sellerData.email,
                phoneNumber: sellerData.phoneNumber,
                storeName: sellerData.storeName,
              }
            : undefined;

        return {
          name: item.name,
          quantity: item.qty,
          price: item.price,
          subtotal: (item.price || 0) * (item.qty || 0),
          seller: sellerInfo,
          size: item.size || undefined,
          color: item.color || undefined,
          ageGroup: item.ageGroup || undefined,
          imageUrl: this.resolveProductImageUrl(item, productData, baseUrl),
        };
      });

      try {
        await this.emailService.sendAdminOrderStatusEmail(adminEmail, {
          orderId,
          status: 'success',
          statusLabel: 'გადახდა წარმატებით დასრულდა',
          customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          },
          shippingAddress: shippingDetails,
          paymentMethod: orderWithData.paymentMethod,
          totals,
          createdAt: orderWithData.createdAt,
          orderItems: adminItems,
        });
      } catch (error) {
        this.logger.error(
          `Failed to send admin email for order ${orderId}: ${error.message}`,
          error.stack,
        );
      }

      try {
        const adminUsers = await this.userModel
          .find({ role: Role.Admin })
          .select('_id')
          .lean();

        if (adminUsers.length > 0) {
          const adminPayload: NotificationPayload = {
            title: '✅ ახალი გადახდილი შეკვეთა',
            body: `#${orderId} • ${orderWithData.orderItems.length} პროდუქტი • ${totals.totalPrice.toFixed(
              2,
            )} ₾`,
            icon: `${baseUrl}/icons/android/icon-192x192.png`,
            badge: `${baseUrl}/icons/pwa/notification-badge.png`,
            data: {
              url: `${baseUrl}/admin/orders/${orderId}`,
              type: 'order_status',
              id: orderId,
            },
            tag: `order-success-${orderId}`,
            requireInteraction: true,
          };

          await Promise.all(
            adminUsers.map((admin) =>
              this.pushNotificationService
                .sendToUser(admin._id.toString(), adminPayload)
                .catch((error) =>
                  this.logger.error(
                    `Failed to send admin push notification (${admin._id}) for order ${orderId}: ${error.message}`,
                    error.stack,
                  ),
                ),
            ),
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to send admin push notifications for order ${orderId}: ${error.message}`,
          error.stack,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to prepare notification payloads for order ${orderId}: ${error.message}`,
        error.stack,
      );
    }
  }

  async handlePaymentFailureNotification(
    orderIdentifier: string,
    status: string,
    reason?: string,
  ): Promise<void> {
    try {
      const filterOr: FilterQuery<Order>[] = [
        { externalOrderId: orderIdentifier },
      ];

      if (Types.ObjectId.isValid(orderIdentifier)) {
        filterOr.push({ _id: new Types.ObjectId(orderIdentifier) } as any);
      }

      const orderWithData: any = await this.orderModel
        .findOne({ $or: filterOr })
        .populate({
          path: 'user',
          select: 'email name ownerFirstName ownerLastName phoneNumber',
        })
        .populate({
          path: 'orderItems.productId',
          select: 'name user images',
          populate: {
            path: 'user',
            select:
              '_id email name ownerFirstName ownerLastName phoneNumber storeName',
          },
        })
        .lean();

      const orderIdForDisplay = orderWithData?._id
        ? orderWithData._id.toString()
        : orderIdentifier;

      const adminEmail = this.getAdminEmail();
      const baseUrl = this.getPrimaryAppUrl();

      const totals = orderWithData
        ? {
            itemsPrice: orderWithData.itemsPrice ?? 0,
            shippingPrice: orderWithData.shippingPrice ?? 0,
            taxPrice: orderWithData.taxPrice ?? 0,
            totalPrice: orderWithData.totalPrice ?? 0,
          }
        : {
            itemsPrice: 0,
            shippingPrice: 0,
            taxPrice: 0,
            totalPrice: 0,
          };

      const adminItems = orderWithData
        ? orderWithData.orderItems.map((item: any) => {
            const productData: any = item.productId;
            const sellerData: any = productData?.user;

            return {
              name: item.name,
              quantity: item.qty,
              price: item.price,
              subtotal: (item.price || 0) * (item.qty || 0),
              seller:
                sellerData && typeof sellerData === 'object'
                  ? {
                      name: this.getDisplayName(
                        sellerData,
                        sellerData.storeName || sellerData.name,
                      ),
                      email: sellerData.email,
                      phoneNumber: sellerData.phoneNumber,
                      storeName: sellerData.storeName,
                    }
                  : undefined,
              size: item.size || undefined,
              color: item.color || undefined,
              ageGroup: item.ageGroup || undefined,
            };
          })
        : [];

      try {
        await this.emailService.sendAdminOrderStatusEmail(adminEmail, {
          orderId: orderIdForDisplay,
          status: 'failure',
          statusLabel: 'გადახდა ვერ შესრულდა',
          reason: reason || status,
          customer: {
            name: this.getDisplayName(orderWithData?.user),
            email: orderWithData?.user?.email,
            phone: orderWithData?.user?.phoneNumber,
          },
          shippingAddress: orderWithData?.shippingDetails,
          paymentMethod: orderWithData?.paymentMethod || 'უცნობი',
          totals,
          createdAt: orderWithData?.createdAt,
          orderItems: adminItems,
        });
      } catch (error) {
        this.logger.error(
          `Failed to send admin payment failure email (${orderIdentifier}): ${error.message}`,
          error.stack,
        );
      }

      try {
        const adminUsers = await this.userModel
          .find({ role: Role.Admin })
          .select('_id')
          .lean();

        if (adminUsers.length > 0) {
          const orderUrl = orderWithData
            ? `${baseUrl}/admin/orders/${orderIdForDisplay}`
            : `${baseUrl}/admin/orders`;

          const adminPayload: NotificationPayload = {
            title: '❌ შეკვეთის გადახდა ვერ შესრულდა',
            body: `#${orderIdForDisplay} • სტატუსი: ${status}`,
            icon: `${baseUrl}/icons/android/icon-192x192.png`,
            badge: `${baseUrl}/icons/pwa/notification-badge.png`,
            data: {
              url: orderUrl,
              type: 'order_status',
              id: orderIdForDisplay,
            },
            tag: `order-failed-${orderIdForDisplay}`,
            requireInteraction: true,
          };

          await Promise.all(
            adminUsers.map((admin) =>
              this.pushNotificationService
                .sendToUser(admin._id.toString(), adminPayload)
                .catch((error) =>
                  this.logger.error(
                    `Failed to send admin failure push (${admin._id}) for order ${orderIdentifier}: ${error.message}`,
                    error.stack,
                  ),
                ),
            ),
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to send admin push notifications for failed order ${orderIdentifier}: ${error.message}`,
          error.stack,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle payment failure notification for order ${orderIdentifier}: ${error.message}`,
        error.stack,
      );
    }
  }
  /**
   * Refund stock if order is cancelled or payment fails
   */
  async refundStock(orderId: string): Promise<void> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        for (const item of order.orderItems) {
          const product = await this.productModel
            .findById(item.productId)
            .session(session);
          if (!product) {
            console.warn(
              `Product with ID ${item.productId} not found during stock refund`,
            );
            continue;
          }
          // Refund stock
          if (
            product.variants &&
            product.variants.length > 0 &&
            (item.size || item.color || item.ageGroup)
          ) {
            const variantIndex = product.variants.findIndex(
              (v) =>
                v.size === item.size &&
                v.color === item.color &&
                v.ageGroup === item.ageGroup,
            );
            if (variantIndex >= 0) {
              product.variants[variantIndex].stock += item.qty;
            } else {
              // Fallback to general stock if variant not found
              product.countInStock += item.qty;
            }
          } else {
            product.countInStock += item.qty;
          }
          await product.save({ session });
        }
      });
    } finally {
      await session.endSession();
    }
  }
  async cancelOrder(id: string, reason?: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid order ID.');
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('No order with given ID.');
    // Check if order is already cancelled
    if (order.status === 'cancelled') {
      throw new BadRequestException('Order is already cancelled.');
    }
    // Check if order is already paid - paid orders cannot be cancelled automatically
    if (order.isPaid) {
      throw new BadRequestException(
        'Cannot cancel paid order automatically. Please contact support.',
      );
    }
    const session = await this.connection.startSession();
    try {
      const updatedOrder = await session.withTransaction(async () => {
        // Refund stock for the order
        await this.refundStockForOrder(order, session);
        // Mark order as cancelled
        order.set('status', 'cancelled');
        order.set('statusReason', reason || 'Manually cancelled');
        order.set('cancelledAt', new Date());
        order.set('stockReservationExpires', undefined); // Remove expiration since it's cancelled
        const updatedOrder = await order.save({ session });
        return updatedOrder;
      });

      return updatedOrder;
    } finally {
      await session.endSession();
    }
  }
  async findUserOrdersByStatus(userId: string, status?: string) {
    const query: any = { user: userId };
    if (status) {
      query.status = status;
    }
    // Sort by createdAt in descending order (newest first)
    const orders = await this.orderModel.find(query).sort({ createdAt: -1 });
    return orders;
  }
  /**
   * Refund stock for a specific order - with safety checks
   * This method is used by the stock reservation service and manual cancellation
   */
  private async refundStockForOrder(
    order: OrderDocument,
    session: ClientSession,
  ) {
    // Ensure order is in a state where stock refund is appropriate
    if (order.isPaid || order.status === 'cancelled') {
      this.logger.warn(
        `Attempted to refund stock for order ${order._id} but it's already paid or cancelled`,
      );
      return;
    }
    for (const item of order.orderItems) {
      const product = await this.productModel
        .findById(item.productId)
        .session(session);
      if (!product) {
        this.logger.warn(
          `Product with ID ${item.productId} not found during stock refund for order ${order._id}`,
        );
        continue;
      }
      // Refund stock
      if (
        product.variants &&
        product.variants.length > 0 &&
        (item.size || item.color || item.ageGroup)
      ) {
        const variantIndex = product.variants.findIndex(
          (v) =>
            v.size === item.size &&
            v.color === item.color &&
            v.ageGroup === item.ageGroup,
        );
        if (variantIndex >= 0) {
          product.variants[variantIndex].stock += item.qty;
        } else {
          // Fallback to general stock if variant not found
          product.countInStock += item.qty;
        }
      } else {
        product.countInStock += item.qty;
      }
      await product.save({ session });
    }
  }
  async findOrdersBySeller(sellerId: string): Promise<OrderDocument[]> {
    // Find all orders that contain products created by this seller OR auction orders where seller owns the auction
    const orders = await this.orderModel
      .find()
      .populate('user', 'name email phoneNumber')
      .populate({
        path: 'orderItems.productId',
        select: 'name user deliveryType minDeliveryDays maxDeliveryDays brand',
        populate: {
          path: 'user',
          select: '_id name email phoneNumber storeName',
        },
      })
      .populate({
        path: 'auctionId',
        select: 'title mainImage seller currentWinner',
        populate: {
          path: 'seller',
          select: '_id name email phoneNumber storeName',
        },
      })
      .sort({ createdAt: -1 });

    // Filter orders to include:
    // 1. Regular orders containing seller's products
    // 2. Auction orders where the seller owns the auction
    const sellerOrders = orders.filter((order) => {
      // Check for auction orders where this seller owns the auction
      if (order.orderType === 'auction' && order.auctionId) {
        const auctionSellerId =
          typeof (order.auctionId as any).seller === 'string'
            ? (order.auctionId as any).seller
            : (order.auctionId as any).seller?._id?.toString() ||
              (order.auctionId as any).seller?.toString();
        if (auctionSellerId === sellerId) {
          console.log(
            'Found auction order for seller:',
            order._id,
            'Auction seller:',
            auctionSellerId,
          );
          return true;
        }
      }

      // Check for regular orders with seller's products
      const hasSellerProduct =
        order.orderItems &&
        order.orderItems.some((item) => {
          if (!item.productId || !(item.productId as any).user) return false;
          const productUserId =
            typeof (item.productId as any).user === 'string'
              ? (item.productId as any).user
              : (item.productId as any).user._id?.toString();
          return productUserId === sellerId;
        });
      return hasSellerProduct;
    });
    return sellerOrders;
  }
}
