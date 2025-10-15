import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { OrdersService } from '../orders/services/orders.service';

interface BogTokenResponse {
  access_token: string;
}

interface BogPaymentResponse {
  id: string;
  _links: {
    redirect: {
      href: string;
    };
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
  ) {}

  private async getToken(): Promise<string> {
    try {
      const clientId = this.configService.get<string>('BOG_CLIENT_ID');
      const clientSecret = this.configService.get<string>('BOG_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        throw new Error('BOG credentials are not configured');
      }

      const response = await axios.post<BogTokenResponse>(
        'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization:
              'Basic ' +
              Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
          },
        },
      );

      return response.data.access_token;
    } catch (error) {
      console.error('BOG Token Error:', error.message);
      throw error;
    }
  }

  async createPayment(data: {
    product: {
      quantity: number;
      unitPrice: number;
      productId: string;
      productName: string;
      totalPrice: number;
    };
    customer: {
      firstName: string;
      lastName: string;
      personalId: string;
      address: string;
      phoneNumber: string;
      email: string;
    };
    successUrl?: string;
    failUrl?: string;
  }) {
    try {
      const token = await this.getToken();
      const externalOrderId = uuidv4();

      const basket = [
        {
          quantity: data.product.quantity,
          unit_price: data.product.unitPrice,
          product_id: data.product.productId,
          description: data.product.productName,
        },
      ];

      const payload = {
        callback_url: this.configService.get('BOG_CALLBACK_URL'),
        capture: 'automatic',
        external_order_id: externalOrderId,
        purchase_units: {
          currency: 'GEL',
          total_amount: data.product.totalPrice,
          basket,
        },
        payment_method: ['card'],
        ttl: 10,
        redirect_urls: {
          success: data.successUrl || 'https://soulart.ge/checkout/success',
          fail: data.failUrl || 'https://soulart.ge/checkout/fail',
        },
      };

      const response = await axios.post<BogPaymentResponse>(
        'https://api.bog.ge/payments/v1/ecommerce/orders',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'Accept-Language': 'ka',
            'Idempotency-Key': uuidv4(),
          },
        },
      );

      return {
        order_id: response.data.id,
        redirect_url: response.data._links.redirect.href,
        token,
        uniqueId: externalOrderId,
      };
    } catch (error) {
      console.error('BOG Service Error:', error);

      if (error.response) {
        console.error('BOG API Response:', error.response.data);
        console.error('BOG API Status:', error.response.status);

        // Return more specific error messages
        if (error.response.status === 401) {
          throw new Error('BOG API authentication failed');
        } else if (error.response.status === 400) {
          throw new Error(
            'Invalid payment data: ' +
              (error.response.data?.message || 'Bad request'),
          );
        } else if (error.response.status >= 500) {
          throw new Error(
            'BOG service is temporarily unavailable. Please try again later.',
          );
        }
      }

      throw new Error(error.message || 'Payment service error');
    }
  }

  async getPaymentStatus(orderId: string): Promise<any> {
    const token = await this.getToken();
    const response = await axios.get(
      `https://api.bog.ge/payments/v1/receipt/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  }

  async handlePaymentCallback(
    callbackData: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(
        'BOG Payment Callback received:',
        JSON.stringify(callbackData, null, 2),
      );

      const {
        external_order_id,
        order_status: { key: status },
        order_id,
      } = callbackData.body;

      if (!external_order_id && !order_id) {
        console.log('No order identifier found in callback data');
        return { success: false, message: 'No order identifier found' };
      }

      console.log(
        `Processing payment for external_order_id: ${external_order_id}, order_id: ${order_id}, status: ${status}`,
      );

      let paymentStatus;
      try {
        if (order_id) {
          console.log(`Fetching payment status for order_id: ${order_id}`);
          paymentStatus = await this.getPaymentStatus(order_id);
          console.log(
            'Payment status from BOG API:',
            JSON.stringify(paymentStatus, null, 2),
          );
        }
      } catch (error) {
        console.log(
          'Error fetching payment status from BOG API:',
          error.message,
        );
        paymentStatus = { status };
      }

      const isPaymentSuccessful =
        paymentStatus?.status === 'completed' || status === 'completed';

      console.log(
        `Payment successful: ${isPaymentSuccessful}, external_order_id: ${external_order_id}`,
      );

      if (isPaymentSuccessful && external_order_id) {
        try {
          const paymentResult = {
            id: order_id || external_order_id,
            status: paymentStatus?.status || status,
            update_time: new Date().toISOString(),
            email_address: paymentStatus?.email || 'unknown@unknown.com',
          };

          console.log(
            'Updating order with payment result:',
            JSON.stringify(paymentResult, null, 2),
          );

          await this.ordersService.updateOrderByExternalId(
            external_order_id,
            paymentResult,
          );

          console.log(
            `Order ${external_order_id} successfully updated with payment status`,
          );

          return {
            success: true,
            message: 'Payment processed successfully and order updated',
          };
        } catch (error) {
          console.error(
            'Error updating order with payment result:',
            error.message,
          );
          return {
            success: false,
            message:
              'Payment successful but failed to update order: ' + error.message,
          };
        }
      } else {
        console.log(
          'Payment was not successful or external_order_id is missing',
        );

        const failureIdentifier = external_order_id || order_id;
        const failureStatus = paymentStatus?.status || status || 'unknown';
        const failureReason =
          paymentStatus?.status_description ||
          paymentStatus?.message ||
          callbackData?.body?.order_status?.description;

        if (failureIdentifier) {
          try {
            await this.ordersService.handlePaymentFailureNotification(
              failureIdentifier,
              failureStatus,
              failureReason,
            );
          } catch (notificationError) {
            this.logger.error(
              `Failed to notify about payment failure (${failureIdentifier}): ${notificationError.message}`,
              notificationError.stack,
            );
          }
        } else {
          this.logger.warn(
            'Payment failure callback did not include an order identifier',
          );
        }

        return {
          success: false,
          message: 'Payment was not successful',
        };
      }
    } catch (error) {
      console.error('Error processing payment callback:', error.message);
      return {
        success: false,
        message: 'Error processing payment callback: ' + error.message,
      };
    }
  }

  async updateOrderWithExternalId(
    orderId: string,
    externalOrderId: string,
  ): Promise<void> {
    try {
      const order = await this.ordersService.findById(orderId);
      if (order) {
        order.externalOrderId = externalOrderId;
        await order.save();
      }
    } catch (error) {
      console.error('Error updating order with external ID:', error);
      throw error;
    }
  }

  async getOrderByExternalId(externalOrderId: string) {
    return this.ordersService.findByExternalOrderId(externalOrderId);
  }
}
