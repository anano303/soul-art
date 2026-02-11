import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { OrdersService } from '../orders/services/orders.service';
import { AuctionService } from '../auctions/services/auction.service';

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
    @Inject(forwardRef(() => AuctionService))
    private readonly auctionService: AuctionService,
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
        payment_method: [
          'card',
          'google_pay',
          'apple_pay',
          'bog_loyalty',
          'bog_p2p',
        ],
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

      console.log('BOG Payment Created Successfully:');
      console.log('BOG Response ID:', response.data.id);
      console.log('External Order ID we sent:', externalOrderId);
      console.log('Full BOG Response:', JSON.stringify(response.data, null, 2));

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
        paymentStatus = { order_status: { key: status } };
      }

      // BOG returns order_status.key = "completed"
      const statusKey =
        paymentStatus?.order_status?.key?.toLowerCase() ||
        status?.toLowerCase();

      const isPaymentSuccessful = statusKey === 'completed';

      console.log(
        `Payment successful: ${isPaymentSuccessful}, external_order_id: ${external_order_id}, statusKey: ${statusKey}`,
      );

      if (isPaymentSuccessful && external_order_id) {
        // First, try to find auction with this external_order_id
        try {
          const auction =
            await this.auctionService.findByExternalOrderId(external_order_id);
          if (auction) {
            console.log(
              `Found auction ${auction._id} for external_order_id: ${external_order_id}`,
            );
            const auctionResult =
              await this.auctionService.handleBogPaymentCallback(
                external_order_id,
                statusKey,
                order_id,
              );
            return auctionResult;
          }
        } catch (auctionError) {
          console.log(
            'Not an auction payment, trying order:',
            auctionError.message,
          );
        }

        // If not an auction, try to update order
        try {
          const paymentResult = {
            id: order_id || external_order_id,
            status: 'COMPLETED',
            update_time: new Date().toISOString(),
            email_address: paymentStatus?.buyer?.email || 'unknown@unknown.com',
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

  // Create BOG payment for auction
  async createAuctionPayment(data: {
    auctionId: string;
    externalOrderId: string;
    title: string;
    artworkPrice: number;
    deliveryFee: number;
    totalPayment: number;
    successUrl?: string;
    failUrl?: string;
  }) {
    try {
      const token = await this.getToken();

      const basket = [
        {
          quantity: 1,
          unit_price: data.artworkPrice,
          product_id: data.auctionId,
          description: `Auction: ${data.title}`,
        },
      ];

      // Add delivery as separate item if there's a fee
      if (data.deliveryFee > 0) {
        basket.push({
          quantity: 1,
          unit_price: data.deliveryFee,
          product_id: `${data.auctionId}-delivery`,
          description: 'Delivery fee',
        });
      }

      const callbackUrl =
        this.configService.get('BOG_AUCTION_CALLBACK_URL') ||
        this.configService.get('BOG_CALLBACK_URL');

      const payload = {
        callback_url: callbackUrl,
        capture: 'automatic',
        external_order_id: data.externalOrderId,
        purchase_units: {
          currency: 'GEL',
          total_amount: data.totalPayment,
          basket,
        },
        payment_method: [
          'card',
          'google_pay',
          'apple_pay',
          'bog_loyalty',
          'bog_p2p',
        ],
        ttl: 10,
        redirect_urls: {
          success:
            data.successUrl ||
            `https://soulart.ge/checkout/success?auctionId=${data.auctionId}`,
          fail:
            data.failUrl ||
            `https://soulart.ge/checkout/fail?auctionId=${data.auctionId}`,
        },
      };

      this.logger.log(
        `Creating BOG payment for auction ${data.auctionId}, total: ${data.totalPayment} GEL`,
      );

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

      this.logger.log(
        `BOG Auction Payment Created: ${response.data.id}, externalOrderId: ${data.externalOrderId}`,
      );

      return {
        bogOrderId: response.data.id,
        redirectUrl: response.data._links.redirect.href,
        externalOrderId: data.externalOrderId,
      };
    } catch (error) {
      this.logger.error(
        `BOG Auction Payment Error: ${error.message}`,
        error.stack,
      );

      if (error.response) {
        this.logger.error(
          `BOG API Response: ${JSON.stringify(error.response.data)}`,
        );
        this.logger.error(`BOG API Status: ${error.response.status}`);
      }

      throw new Error(error.message || 'Auction payment service error');
    }
  }

  // PayPal Payment Methods
  private async getPayPalToken(): Promise<string> {
    try {
      const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
      const clientSecret = this.configService.get<string>(
        'PAYPAL_CLIENT_SECRET',
      );

      if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials are not configured');
      }

      const response = await axios.post(
        'https://api-m.paypal.com/v1/oauth2/token',
        'grant_type=client_credentials',
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
      this.logger.error('PayPal Token Error:', error.message);
      throw error;
    }
  }

  async createPayPalPayment(data: {
    orderId: string;
    amount: number;
    currency?: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    try {
      console.log(
        'PayPal createPayPalPayment called with:',
        JSON.stringify(data, null, 2),
      );
      const token = await this.getPayPalToken();
      console.log('PayPal token received:', token ? 'YES' : 'NO');

      // Convert GEL to USD (approximate rate - you may want to fetch real-time rates)
      const gelToUsdRate = 0.37; // 1 GEL ≈ 0.37 USD
      const amountUsd = (data.amount * gelToUsdRate).toFixed(2);

      const payload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: data.orderId,
            amount: {
              currency_code: 'USD',
              value: amountUsd,
            },
            description: 'Sales revenue from SoulArt',
          },
        ],
        application_context: {
          brand_name: 'SoulArt',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          return_url: data.successUrl,
          cancel_url: data.cancelUrl,
        },
      };

      const response = await axios.post(
        'https://api-m.paypal.com/v2/checkout/orders',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      this.logger.log(
        `PayPal Order Created: ${response.data.id} for order ${data.orderId}`,
      );

      // Find approval link
      const approvalLink = response.data.links.find(
        (link: { rel: string; href: string }) => link.rel === 'approve',
      );

      if (!approvalLink) {
        throw new Error('No approval URL in PayPal response');
      }

      // Update order with PayPal ID
      await this.ordersService.updateOrderPaymentInfo(data.orderId, {
        id: response.data.id,
        status: 'CREATED',
        update_time: new Date().toISOString(),
        paymentMethod: 'PAYPAL',
      });

      return {
        success: true,
        paypalOrderId: response.data.id,
        approvalUrl: approvalLink.href,
      };
    } catch (error) {
      this.logger.error(`PayPal Payment Error: ${error.message}`, error.stack);

      if (error.response) {
        this.logger.error(
          `PayPal API Response: ${JSON.stringify(error.response.data)}`,
        );
      }

      return {
        success: false,
        message:
          'PayPal გადახდა ვერ მოხერხდა. გთხოვთ გამოიყენოთ ბარათით გადახდა.',
        approvalUrl: null,
      };
    }
  }

  // Capture PayPal payment after user approval
  async capturePayPalPayment(paypalOrderId: string, orderId: string) {
    try {
      const token = await this.getPayPalToken();

      const response = await axios.post(
        `https://api-m.paypal.com/v2/checkout/orders/${paypalOrderId}/capture`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      this.logger.log(
        `PayPal Order Captured: ${paypalOrderId}, Status: ${response.data.status}`,
      );

      if (response.data.status === 'COMPLETED') {
        // Mark order as paid
        await this.ordersService.updateOrderPaymentInfo(orderId, {
          id: paypalOrderId,
          status: 'COMPLETED',
          update_time: new Date().toISOString(),
          paymentMethod: 'PAYPAL',
        });

        return {
          success: true,
          status: 'COMPLETED',
          orderId,
          paypalOrderId,
        };
      }

      return {
        success: false,
        status: response.data.status,
        message: 'Payment not completed',
      };
    } catch (error) {
      this.logger.error(`PayPal Capture Error: ${error.message}`, error.stack);

      if (error.response) {
        this.logger.error(
          `PayPal Capture Response: ${JSON.stringify(error.response.data)}`,
        );
      }

      return {
        success: false,
        message: 'გადახდის დადასტურება ვერ მოხერხდა',
      };
    }
  }

  // Verify PayPal payment status
  async verifyPayPalPayment(orderId: string) {
    try {
      const order = await this.ordersService.findById(orderId);

      if (!order) {
        return { success: false, message: 'Order not found' };
      }

      // Check if order is already paid
      if (order.isPaid) {
        return { success: true, isPaid: true, status: 'COMPLETED' };
      }

      // If order has PayPal ID, check its status
      if (order.payment?.id && order.payment?.paymentMethod === 'PAYPAL') {
        const token = await this.getPayPalToken();

        const response = await axios.get(
          `https://api-m.paypal.com/v2/checkout/orders/${order.payment.id}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );

        this.logger.log(
          `PayPal Order Status: ${response.data.status} for order ${orderId}`,
        );

        // If approved but not captured, capture it
        if (response.data.status === 'APPROVED') {
          return await this.capturePayPalPayment(order.payment.id, orderId);
        }

        if (response.data.status === 'COMPLETED') {
          // Mark order as paid if not already
          await this.ordersService.updateOrderPaymentInfo(orderId, {
            id: order.payment.id,
            status: 'COMPLETED',
            update_time: new Date().toISOString(),
            paymentMethod: 'PAYPAL',
          });

          return { success: true, isPaid: true, status: 'COMPLETED' };
        }

        return {
          success: false,
          isPaid: false,
          status: response.data.status,
        };
      }

      return {
        success: false,
        isPaid: false,
        message: 'No PayPal payment found',
      };
    } catch (error) {
      this.logger.error(`PayPal Verify Error: ${error.message}`, error.stack);
      return { success: false, message: 'Verification failed' };
    }
  }
}
