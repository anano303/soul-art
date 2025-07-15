import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

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
