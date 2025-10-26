import { Controller, Post, Body, Get, Param, UseInterceptors } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { paymentRateLimit } from '@/middleware/security.middleware';
import { createRateLimitInterceptor } from '@/interceptors/rate-limit.interceptor';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseInterceptors(createRateLimitInterceptor(paymentRateLimit))
  @Post('bog/create')
  async createBogPayment(@Body() data: any) {
    try {
      const result = await this.paymentsService.createPayment(data);

      // Update order with external_order_id for callback processing
      if (result.uniqueId && data.product?.productId) {
        try {
          await this.paymentsService.updateOrderWithExternalId(
            data.product.productId,
            result.uniqueId,
          );
          
          // Store BOG's order_id for status verification
          if (result.order_id) {
            await this.paymentsService['ordersService'].updateOrderPaymentInfo(
              data.product.productId,
              {
                id: result.order_id,
                status: 'pending',
                update_time: new Date().toISOString(),
              }
            );
          }
        } catch (error) {
          console.error('Failed to update order with external ID:', error);
          // Continue with payment creation even if this fails
        }
      }

      return result;
    } catch (error) {
      console.error('BOG Payment Error:', error);
      throw error;
    }
  }

  @Get('bog/status/:orderId')
  async getBogPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentStatus(orderId);
  }

  @Post('bog/verify/:orderId')
  async verifyBogPayment(@Param('orderId') orderId: string) {
    try {
      console.log(`Manual payment verification requested for order: ${orderId}`);
      
      // Try to find order by _id first, then by externalOrderId
      let order;
      try {
        order = await this.paymentsService['ordersService'].findById(orderId);
      } catch (error) {
        // If not found by _id, try externalOrderId
        try {
          order = await this.paymentsService.getOrderByExternalId(orderId);
        } catch (e) {
          return { 
            success: false, 
            message: 'Order not found' 
          };
        }
      }
      
      if (!order) {
        return { 
          success: false, 
          message: 'Order not found' 
        };
      }

      console.log(`Found order: ${order._id}, externalOrderId: ${order.externalOrderId}, isPaid: ${order.isPaid}`);

      // If already paid, return success
      if (order.isPaid) {
        return { 
          success: true, 
          message: 'Order already marked as paid',
          isPaid: true
        };
      }

      // Use BOG's order_id from paymentResult to check payment status
      const bogOrderId = order.paymentResult?.id;
      
      if (!bogOrderId) {
        console.log('No BOG order_id found in paymentResult');
        return { 
          success: false, 
          message: 'BOG order ID not available yet',
          isPaid: false
        };
      }

      console.log('Checking payment status with BOG order_id:', bogOrderId);
      
      try {
        const paymentStatus = await this.paymentsService.getPaymentStatus(bogOrderId);
        console.log('BOG payment status:', JSON.stringify(paymentStatus, null, 2));
        
        // BOG returns order_status.key = "completed"
        const statusKey = paymentStatus?.order_status?.key?.toLowerCase();
        
        if (statusKey === 'completed') {
          console.log('Payment completed! Updating order...');
          
          // Update the order
          const paymentResult = {
            id: bogOrderId,
            status: 'COMPLETED',
            update_time: new Date().toISOString(),
            email_address: paymentStatus.buyer?.email || order.user?.email || 'unknown@unknown.com',
          };
          
          await this.paymentsService['ordersService'].updateOrderByExternalId(
            order.externalOrderId,
            paymentResult
          );
          
          console.log('Order updated successfully to isPaid=true');
          
          return { 
            success: true, 
            message: 'Payment verified and order updated',
            isPaid: true
          };
        } else {
          console.log('Payment not completed. Status:', statusKey);
        }
      } catch (error) {
        console.error('Error fetching payment status from BOG:', error.message);
      }

      return { 
        success: false, 
        message: 'Payment not completed yet',
        isPaid: false
      };
    } catch (error) {
      console.error('Error verifying payment:', error);
      return { 
        success: false, 
        message: error.message,
        isPaid: false
      };
    }
  }

  @UseInterceptors(createRateLimitInterceptor(paymentRateLimit))
  @Post('bog/callback')
  async handleBogCallback(@Body() data: any) {
    console.log('BOG Payment Callback endpoint hit');
    console.log('Callback data received:', JSON.stringify(data, null, 2));

    const result = await this.paymentsService.handlePaymentCallback(data);

    console.log('Callback processing result:', JSON.stringify(result, null, 2));

    return {
      status: result.success ? 'success' : 'failed',
      message: result.message,
    };
  }
}
