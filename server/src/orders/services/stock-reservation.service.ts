import { Injectable, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, ClientSession } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Product } from '../../products/schemas/product.schema';

@Injectable()
export class StockReservationService {
  private readonly logger = new Logger(StockReservationService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectConnection() private connection: Connection,
  ) {}

  /**
   * Runs every 10 minutes to check for expired stock reservations
   * Automatically releases expired stock reservations and marks orders as cancelled
   */
  @Cron('0 */1 * * * *') // Every 1 minutes
  async releaseExpiredStockReservations() {
    const now = new Date();

    // Find unpaid orders with expired stock reservations that haven't been processed yet
    const expiredOrders = await this.orderModel.find({
      isPaid: false,
      stockReservationExpires: { $lte: now },
      status: { $in: ['pending', 'processing'] }, // Only process pending/processing orders
    });

    if (expiredOrders.length === 0) {
      return;
    }

    this.logger.log(
      `Processing ${expiredOrders.length} expired stock reservations`,
    );

    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        for (const order of expiredOrders) {
          try {
            // Double-check order hasn't been paid or cancelled in the meantime
            const freshOrder = await this.orderModel
              .findById(order._id)
              .session(session);

            if (
              !freshOrder ||
              freshOrder.isPaid ||
              freshOrder.status === 'cancelled'
            ) {
              this.logger.log(
                `Skipping order ${order._id} - already processed or paid`,
              );
              continue;
            }

            await this.refundStockForOrder(freshOrder, session);

            // Mark order as cancelled instead of deleting it
            freshOrder.set('status', 'cancelled');
            freshOrder.set(
              'statusReason',
              'Stock reservation expired after 30 minutes',
            );
            freshOrder.set('cancelledAt', new Date());
            await freshOrder.save({ session });

            this.logger.log(
              `Released stock and cancelled expired order: ${order._id}`,
            );
          } catch (error) {
            this.logger.error(
              `Error releasing stock for order ${order._id}:`,
              error,
            );
          }
        }
      });
    } finally {
      await session.endSession();
    }

    this.logger.log(
      `Released stock for ${expiredOrders.length} expired orders`,
    );
  }

  /**
   * Refund stock for a specific order - with safety checks
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
      if (product.variants && product.variants.length > 0) {
        const hasVariantAttributes = item.size || item.color || item.ageGroup;
        
        if (hasVariantAttributes) {
          const variantIndex = product.variants.findIndex(
            (v) =>
              v.size === item.size &&
              v.color === item.color &&
              v.ageGroup === item.ageGroup,
          );

          if (variantIndex >= 0) {
            product.variants[variantIndex].stock += item.qty;
          } else {
            product.variants.push({
              size: item.size,
              color: item.color,
              ageGroup: item.ageGroup,
              stock: item.qty,
            });
          }
        } else {
          // Product has variants but no specific attributes - use first variant
          product.variants[0].stock += item.qty;
        }
        product.countInStock += item.qty;
      } else {
        // Legacy products without variants
        product.countInStock += item.qty;
      }

      await product.save({ session });
    }
  }

  /**
   * Manually release stock for a specific order (can be called from API)
   */
  async releaseStockForOrder(orderId: string): Promise<void> {
    const order = await this.orderModel.findById(orderId);

    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    if (order.isPaid) {
      throw new Error(`Cannot release stock for paid order ${orderId}`);
    }

    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        await this.refundStockForOrder(order, session);

        // Mark order as cancelled
        order.set('status', 'cancelled');
        order.set('statusReason', 'Manually cancelled');
        await order.save({ session });
      });

      this.logger.log(`Manually released stock for order: ${orderId}`);
    } finally {
      await session.endSession();
    }
  }
}
