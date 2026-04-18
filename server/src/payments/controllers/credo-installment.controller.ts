import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseInterceptors,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  CredoInstallmentService,
  CredoProduct,
} from '../services/credo-installment.service';
import { OrdersService } from '../../orders/services/orders.service';
import { paymentRateLimit } from '@/middleware/security.middleware';
import { createRateLimitInterceptor } from '@/interceptors/rate-limit.interceptor';

interface CreateCredoInstallmentDto {
  orderId: string;
  products: Array<{
    id: string;
    title: string;
    amount: number;
    price: number; // price in GEL (will be converted to tetri)
  }>;
}

@Controller('payments/credo')
export class CredoInstallmentController {
  private readonly logger = new Logger(CredoInstallmentController.name);

  constructor(
    private readonly credoInstallmentService: CredoInstallmentService,
    private readonly ordersService: OrdersService,
  ) {}

  @UseInterceptors(createRateLimitInterceptor(paymentRateLimit))
  @Post('installment/create')
  async createInstallmentOrder(@Body() body: CreateCredoInstallmentDto) {
    try {
      const { orderId, products } = body;

      if (!orderId) {
        throw new BadRequestException('orderId is required');
      }

      if (!products || products.length === 0) {
        throw new BadRequestException('At least one product is required');
      }

      // Validate each product
      for (const product of products) {
        if (!product.id || !product.title || !product.amount || !product.price) {
          throw new BadRequestException(
            'Each product must have id, title, amount, and price',
          );
        }
        if (product.price <= 0) {
          throw new BadRequestException('Product price must be positive');
        }
        if (product.amount <= 0) {
          throw new BadRequestException('Product quantity must be positive');
        }
      }

      // Generate unique orderCode using orderId + timestamp to allow retries
      const orderCode = `SA_${orderId}_${Date.now()}`;

      // Convert product prices from GEL to tetri (multiply by 100)
      const credoProducts: CredoProduct[] = products.map((p) => ({
        id: p.id,
        title: p.title,
        amount: p.amount,
        price: Math.round(p.price * 100), // Convert GEL to tetri
        type: '0',
      }));

      const result =
        await this.credoInstallmentService.createInstallmentOrder(
          orderCode,
          credoProducts,
        );

      // Update order with Credo installment info
      try {
        const order = await this.ordersService.findById(orderId);
        if (order) {
          // Set externalOrderId for status tracking
          order.externalOrderId = orderCode;
          await order.save();

          await this.ordersService.updateOrderPaymentInfo(orderId, {
            id: orderCode,
            status: 'credo_installment_pending',
            update_time: new Date().toISOString(),
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to update order with Credo info: ${error.message}`,
        );
      }

      return {
        success: true,
        redirectUrl: result.redirectUrl,
        orderCode: result.orderCode,
      };
    } catch (error) {
      this.logger.error(`Credo installment creation error: ${error.message}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        error.message || 'Failed to create installment order',
      );
    }
  }

  @Get('installment/status/:orderCode')
  async getInstallmentStatus(@Param('orderCode') orderCode: string) {
    try {
      if (!orderCode) {
        throw new BadRequestException('orderCode is required');
      }

      const statusResponse =
        await this.credoInstallmentService.getInstallmentStatus(orderCode);

      if (statusResponse.status === 200 && statusResponse.data !== null) {
        const statusId = statusResponse.data;
        const statusName =
          this.credoInstallmentService.getStatusName(statusId);
        const isSuccessful =
          this.credoInstallmentService.isInstallmentSuccessful(statusId);
        const isReadyForShipment =
          this.credoInstallmentService.isReadyForShipment(statusId);
        const isFailed =
          this.credoInstallmentService.isInstallmentFailed(statusId);
        const isPending =
          this.credoInstallmentService.isInstallmentPending(statusId);

        // If status is DOCUMENT_ASSIGNED or CLOSED_SUCCESSFULLY, mark order as paid
        if (isReadyForShipment || isSuccessful) {
          try {
            const paymentResult = {
              id: orderCode,
              status: 'COMPLETED',
              update_time: new Date().toISOString(),
              email_address: statusResponse.info?.Mobile || '',
            };
            await this.ordersService.updateOrderByExternalId(
              orderCode,
              paymentResult,
            );
            this.logger.log(
              `Credo installment order ${orderCode} marked as paid (status: ${statusId})`,
            );
          } catch (updateError) {
            this.logger.error(
              `Failed to update order for Credo status: ${updateError.message}`,
            );
          }
        }

        // If status is REJECTED or CANCELED, cancel the order and release stock
        if (isFailed) {
          try {
            // Extract orderId from orderCode format: SA_<orderId>_<timestamp>
            const orderId = orderCode.replace(/^SA_/, '').replace(/_\d+$/, '');
            await this.ordersService.cancelOrder(
              orderId,
              `კრედო განვადება ${statusId === 6 ? 'უარყოფილია' : 'გაუქმებულია'} (სტატუსი: ${statusName})`,
            );
            this.logger.log(
              `Credo installment order ${orderCode} cancelled and stock released (status: ${statusId})`,
            );
          } catch (cancelError) {
            // Order might already be cancelled - that's fine
            this.logger.warn(
              `Could not cancel order for Credo rejection: ${cancelError.message}`,
            );
          }
        }

        return {
          success: true,
          statusId,
          statusName,
          isSuccessful,
          isReadyForShipment,
          isFailed,
          isPending,
          customerInfo: statusResponse.info || null,
        };
      }

      return {
        success: false,
        message: statusResponse.message,
        statusCode: statusResponse.status,
      };
    } catch (error) {
      this.logger.error(
        `Credo installment status check error: ${error.message}`,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      return {
        success: false,
        message: error.message || 'Failed to check installment status',
      };
    }
  }
}
