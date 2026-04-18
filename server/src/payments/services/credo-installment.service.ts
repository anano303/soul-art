import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface CredoProduct {
  id: string;
  title: string;
  amount: number;
  price: number; // in Georgian tetri (1 GEL = 100 tetri)
  type: string; // always "0"
}

export interface CredoOrderRequest {
  merchantId: string;
  orderCode: string;
  products: CredoProduct[];
}

export interface CredoOrderResponse {
  status: number;
  message: string;
  data: {
    URL: string;
  };
}

export interface CredoStatusResponse {
  status: number;
  message: string;
  data: number | null;
  info?: {
    FirstName: string;
    LastName: string;
    PersonalNumber: string;
    Mobile: string;
  };
}

// Credo installment statuses from documentation
export enum CredoInstallmentStatus {
  NEED_IDENTIFICATION = 10,
  SENT = 2,
  SENT_TO_BRANCH = 9,
  SENT_TO_BACK_OFFICE_2 = 14,
  APPROVED = 3,
  LATEST_APPROVED = 4,
  DOCUMENT_ASSIGNED = 12,
  CLOSED_SUCCESSFULLY = 5,
  REJECTED = 6,
  CANCELED = 7,
  DRAFT = 11,
  SENT_TO_VIDEO_MONITORING = 13,
}

export const CredoStatusNames: Record<number, string> = {
  [CredoInstallmentStatus.NEED_IDENTIFICATION]: 'იდენტიფიკაცია საჭიროა',
  [CredoInstallmentStatus.SENT]: 'მუშავდება',
  [CredoInstallmentStatus.SENT_TO_BRANCH]: 'ფილიალში გაგზავნილია',
  [CredoInstallmentStatus.SENT_TO_BACK_OFFICE_2]: 'ბანკში განხილვაზეა',
  [CredoInstallmentStatus.APPROVED]: 'დამტკიცებულია',
  [CredoInstallmentStatus.LATEST_APPROVED]: 'ხელმოწერა საჭიროა',
  [CredoInstallmentStatus.DOCUMENT_ASSIGNED]: 'პროდუქტი უნდა გაიგზავნოს',
  [CredoInstallmentStatus.CLOSED_SUCCESSFULLY]: 'დასრულებულია',
  [CredoInstallmentStatus.REJECTED]: 'უარყოფილია',
  [CredoInstallmentStatus.CANCELED]: 'გაუქმებულია',
  [CredoInstallmentStatus.DRAFT]: 'მონახაზი',
  [CredoInstallmentStatus.SENT_TO_VIDEO_MONITORING]: 'ვიდეო მონიტორინგზეა',
};

@Injectable()
export class CredoInstallmentService {
  private readonly logger = new Logger(CredoInstallmentService.name);
  private readonly apiUrl =
    'https://ganvadeba.credo.ge/widget_api/order.php';
  private readonly statusUrl =
    'https://ganvadeba.credo.ge/widget/api.php';

  constructor(private readonly configService: ConfigService) {}

  private getMerchantId(): string {
    const merchantId = this.configService.get<string>(
      'CREDO_INSTALLMENT_MERCHANT_ID',
    );
    if (!merchantId) {
      throw new Error('CREDO_INSTALLMENT_MERCHANT_ID is not configured');
    }
    return merchantId;
  }

  private getSecretBuffer(): Buffer {
    const secret = this.configService.get<string>(
      'CREDO_INSTALLMENT_SECRET',
    );
    if (!secret) {
      throw new Error('CREDO_INSTALLMENT_SECRET is not configured');
    }
    // Parse PHP-style escape sequences: \0 = NULL byte, \00 = NULL + "0", etc.
    const parsed = secret.replace(/\\0/g, '\x00');
    return Buffer.from(parsed, 'binary');
  }

  /**
   * Generate the MD5 check hash for order creation.
   * Formula: MD5(product1.id + product1.title + product1.amount + product1.price + product1.type + ... + secret)
   */
  private generateCheckHash(products: CredoProduct[]): string {
    let stringToHash = '';
    for (const product of products) {
      stringToHash +=
        product.id + product.title + product.amount + product.price + product.type;
    }
    const productBuf = Buffer.from(stringToHash, 'utf8');
    const secretBuf = this.getSecretBuffer();

    return crypto
      .createHash('md5')
      .update(Buffer.concat([productBuf, secretBuf]))
      .digest('hex');
  }

  /**
   * Generate the MD5 hash for status check.
   * Formula: MD5(merchantId + orderCode + secret)
   */
  private generateStatusHash(orderCode: string): string {
    const prefixBuf = Buffer.from(
      this.getMerchantId() + orderCode,
      'utf8',
    );
    const secretBuf = this.getSecretBuffer();
    return crypto
      .createHash('md5')
      .update(Buffer.concat([prefixBuf, secretBuf]))
      .digest('hex');
  }

  /**
   * Create a Credo installment order.
   * Returns a redirect URL where the customer completes the installment application.
   */
  async createInstallmentOrder(
    orderCode: string,
    products: CredoProduct[],
  ): Promise<{ redirectUrl: string; orderCode: string }> {
    const merchantId = this.getMerchantId();
    const check = this.generateCheckHash(products);

    const payload = {
      merchantId,
      orderCode,
      check,
      products: products.map((p) => ({
        id: p.id,
        title: p.title,
        amount: p.amount,
        price: p.price,
        type: p.type,
      })),
    };

    this.logger.log(
      `Creating Credo installment order: ${orderCode}, products: ${products.length}`,
    );

    try {
      const response = await axios.post<CredoOrderResponse>(
        this.apiUrl,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(
        `Credo installment response: ${JSON.stringify(response.data)}`,
      );

      if (response.data?.data?.URL) {
        return {
          redirectUrl: response.data.data.URL,
          orderCode,
        };
      }

      throw new Error(
        `Credo installment order creation failed: ${response.data?.message || 'Unknown error'}`,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errData = error.response?.data;
        this.logger.error(
          `Credo API error: ${error.response?.status} - ${JSON.stringify(errData)}`,
        );
        // Forward the exact Credo error for debugging
        const credoErrorCode = errData?.errors?.code || '';
        const credoErrorMsg = errData?.errors?.message || errData?.message || error.message;
        throw new Error(
          `Credo API error: ${credoErrorCode} - ${credoErrorMsg}`,
        );
      }
      throw error;
    }
  }

  /**
   * Check the status of a Credo installment order.
   */
  async getInstallmentStatus(
    orderCode: string,
  ): Promise<CredoStatusResponse> {
    const merchantId = this.getMerchantId();
    const hash = this.generateStatusHash(orderCode);

    const url = `${this.statusUrl}?merchantId=${merchantId}&orderCode=${encodeURIComponent(orderCode)}&hash=${hash}`;

    this.logger.log(
      `Checking Credo installment status for orderCode: ${orderCode}`,
    );

    try {
      const response = await axios.get<CredoStatusResponse>(url);

      this.logger.log(
        `Credo status response: ${JSON.stringify(response.data)}`,
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Credo status API error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
        );
      }
      throw error;
    }
  }

  /**
   * Check if installment status indicates successful completion.
   */
  isInstallmentSuccessful(statusId: number): boolean {
    return statusId === CredoInstallmentStatus.CLOSED_SUCCESSFULLY;
  }

  /**
   * Check if installment status indicates the contract is signed and products should be sent.
   */
  isReadyForShipment(statusId: number): boolean {
    return statusId === CredoInstallmentStatus.DOCUMENT_ASSIGNED;
  }

  /**
   * Check if installment is in a terminal failed state.
   */
  isInstallmentFailed(statusId: number): boolean {
    return (
      statusId === CredoInstallmentStatus.REJECTED ||
      statusId === CredoInstallmentStatus.CANCELED
    );
  }

  /**
   * Check if installment is still being processed.
   */
  isInstallmentPending(statusId: number): boolean {
    return [
      CredoInstallmentStatus.NEED_IDENTIFICATION,
      CredoInstallmentStatus.SENT,
      CredoInstallmentStatus.SENT_TO_BRANCH,
      CredoInstallmentStatus.SENT_TO_BACK_OFFICE_2,
      CredoInstallmentStatus.APPROVED,
      CredoInstallmentStatus.LATEST_APPROVED,
      CredoInstallmentStatus.DRAFT,
      CredoInstallmentStatus.SENT_TO_VIDEO_MONITORING,
    ].includes(statusId);
  }

  /**
   * Get human-readable status name.
   */
  getStatusName(statusId: number): string {
    return CredoStatusNames[statusId] || 'უცნობი სტატუსი';
  }
}
