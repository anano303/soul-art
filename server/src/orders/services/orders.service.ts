import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { PaymentResult } from 'src/interfaces';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Product } from '../../products/schemas/product.schema';
import { ProductsService } from '@/products/services/products.service';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    private productsService: ProductsService,
    @InjectConnection() private connection: Connection,
  ) {}
  async create(
    orderAttrs: Partial<Order>,
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
    } = orderAttrs;
    if (orderItems && orderItems.length < 1)
      throw new BadRequestException('No order items received.');
    // Start MongoDB transaction to prevent race conditions
    const session = await this.connection.startSession();
    try {
      return await session.withTransaction(async () => {
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
              stockReservationExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
            },
          ],
          { session },
        );
        return createdOrder[0];
      });
    } finally {
      await session.endSession();
    }
  }
  async findAll(): Promise<OrderDocument[]> {
    // Sort by createdAt in descending order (newest first)
    const orders = await this.orderModel
      .find()
      .populate('user', 'name email')
      .populate({
        path: 'orderItems.productId',
        select: 'name user deliveryType minDeliveryDays maxDeliveryDays',
        populate: {
          path: 'user',
          select: '_id name email',
        },
      })
      .sort({ createdAt: -1 });
    return orders;
  }
  async findById(id: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid order ID.');
    const order = await this.orderModel
      .findById(id)
      .populate('user', 'name email');
    if (!order) throw new NotFoundException('No order with given ID.');
    return order;
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
    return updatedOrder;
  }
  async updateDelivered(id: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid order ID.');
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('No order with given ID.');
    order.isDelivered = true;
    order.deliveredAt = Date();
    order.status = 'delivered'; // Update status to delivered
    const updatedOrder = await order.save();
    return updatedOrder;
  }
  async findUserOrders(userId: string) {
    // Sort by createdAt in descending order (newest first)
    const orders = await this.orderModel
      .find({ user: userId })
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
    return updatedOrder;
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
      return await session.withTransaction(async () => {
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
  private async refundStockForOrder(order: OrderDocument, session: any) {
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
    // Find all orders that contain products created by this seller
    const orders = await this.orderModel
      .find()
      .populate('user', 'name email')
      .populate({
        path: 'orderItems.productId',
        select: 'name user deliveryType minDeliveryDays maxDeliveryDays',
        populate: {
          path: 'user',
          select: '_id',
        },
      })
      .sort({ createdAt: -1 });
    // Filter orders to only include those containing seller's products
    const sellerOrders = orders.filter((order) => {
      console.log(
        'Checking order:',
        order._id,
        'Items count:',
        order.orderItems?.length,
      );
      const hasSellerProduct =
        order.orderItems &&
        order.orderItems.some((item, index) => {
          console.log(`Item ${index}:`, {
            hasProductId: !!item.productId,
            productIdType: typeof item.productId,
            productId: item.productId
              ? (item.productId as any)._id
              : 'no productId',
            hasUser: !!(item.productId as any)?.user,
            userType: typeof (item.productId as any)?.user,
            userId:
              (item.productId as any)?.user?._id ||
              (item.productId as any)?.user,
          });
          if (!item.productId || !(item.productId as any).user) return false;
          const productUserId =
            typeof (item.productId as any).user === 'string'
              ? (item.productId as any).user
              : (item.productId as any).user._id?.toString();
          const isMatch = productUserId === sellerId;
          console.log(
            'Comparing:',
            productUserId,
            'vs',
            sellerId,
            'Match:',
            isMatch,
          );
          if (isMatch) {
            console.log(
              'Found order with seller product:',
              order._id,
              'Product user:',
              productUserId,
            );
          }
          return isMatch;
        });
      return hasSellerProduct;
    });
    return sellerOrders;
  }
}
