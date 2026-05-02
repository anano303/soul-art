import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Voucher, VoucherDocument } from '../schemas/voucher.schema';
import { Order, OrderDocument } from '../../orders/schemas/order.schema';
import * as crypto from 'crypto';

function generateCode(): string {
  // Format: SOUL-XXXX-XXXX (uppercase alphanumeric, no ambiguous chars)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = (len: number) =>
    Array.from(
      { length: len },
      () => chars[crypto.randomInt(chars.length)],
    ).join('');
  return `SOUL-${segment(4)}-${segment(4)}`;
}

@Injectable()
export class VoucherService {
  private readonly logger = new Logger(VoucherService.name);

  constructor(
    @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  /**
   * Admin: create a new voucher
   */
  async create(data: {
    amount: 100 | 200 | 500;
    currency: 'GEL' | 'USD' | 'EUR';
    assignedTo?: string; // userId, optional
  }): Promise<VoucherDocument> {
    if (![100, 200, 500].includes(data.amount)) {
      throw new BadRequestException('Amount must be 100, 200, or 500');
    }

    // Generate unique code (retry on collision)
    let code: string;
    let attempts = 0;
    do {
      code = generateCode();
      const existing = await this.voucherModel.findOne({ code });
      if (!existing) break;
      attempts++;
      if (attempts > 10)
        throw new Error('Failed to generate unique voucher code');
    } while (true);

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const voucher = await this.voucherModel.create({
      code,
      amount: data.amount,
      currency: data.currency,
      assignedTo: data.assignedTo ? new Types.ObjectId(data.assignedTo) : null,
      expiresAt,
    });

    return voucher;
  }

  /**
   * Validate a voucher code without redeeming it.
   * Returns voucher info if valid.
   */
  async validate(
    code: string,
    currency: string,
  ): Promise<{
    valid: boolean;
    amount?: number;
    currency?: string;
    message?: string;
  }> {
    const upperCode = code.toUpperCase().trim();
    const voucher = await this.voucherModel.findOne({ code: upperCode });

    if (!voucher) {
      return { valid: false, message: 'ვაუჩერი ვერ მოიძებნა' };
    }
    if (!voucher.isActive) {
      return { valid: false, message: 'ვაუჩერი გაუქმებულია' };
    }
    if (voucher.isUsed) {
      return { valid: false, message: 'ვაუჩერი უკვე გამოყენებულია' };
    }
    if (voucher.expiresAt < new Date()) {
      return { valid: false, message: 'ვაუჩერის ვადა ამოიწურა' };
    }
    if (voucher.currency !== currency) {
      return {
        valid: false,
        message: `ეს ვაუჩერი ${voucher.currency} ვალუტისთვისაა`,
      };
    }

    return { valid: true, amount: voucher.amount, currency: voucher.currency };
  }

  /**
   * Atomically redeem a voucher within an order.
   * Marks the voucher as used and links it to the order.
   * Should be called inside order creation transaction.
   */
  async redeem(
    code: string,
    currency: string,
    orderId: Types.ObjectId,
    userId: Types.ObjectId | null,
  ): Promise<VoucherDocument> {
    const upperCode = code.toUpperCase().trim();

    // Atomic findOneAndUpdate to prevent race conditions
    const voucher = await this.voucherModel.findOneAndUpdate(
      {
        code: upperCode,
        isUsed: false,
        isActive: true,
        currency,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          isUsed: true,
          usedAt: new Date(),
          usedInOrder: orderId,
          usedBy: userId,
        },
      },
      { new: true },
    );

    if (!voucher) {
      throw new BadRequestException(
        'ვაუჩერი არავალიდურია, ვადაგასულია, ან უკვე გამოყენებულია',
      );
    }

    return voucher;
  }

  /**
   * Admin: list all vouchers with pagination
   */
  async findAll(
    page = 1,
    limit = 50,
    currency?: string,
    isUsed?: boolean,
  ): Promise<{ items: VoucherDocument[]; total: number }> {
    const filter: any = {};
    if (currency) filter.currency = currency;
    if (isUsed !== undefined) filter.isUsed = isUsed;

    const [items, total] = await Promise.all([
      this.voucherModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('assignedTo', 'email name')
        .populate('usedBy', 'email name')
        .lean(),
      this.voucherModel.countDocuments(filter),
    ]);

    return { items: items as VoucherDocument[], total };
  }

  /**
   * Admin: list voucher purchase orders (paid orders with orderType='voucher')
   */
  async getPurchasedOrders(
    page = 1,
    limit = 50,
  ): Promise<{ items: any[]; total: number }> {
    const filter = { orderType: 'voucher', isPaid: true };
    const [items, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ paidAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'email name ownerFirstName ownerLastName')
        .select(
          '_id issuedVoucherCode issuedVoucherAmount issuedVoucherCurrency isPaid paidAt createdAt user totalPrice externalOrderId',
        )
        .lean(),
      this.orderModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  /**
   * Admin: deactivate a voucher
   */
  async deactivate(id: string): Promise<void> {
    const result = await this.voucherModel.findByIdAndUpdate(id, {
      isActive: false,
    });
    if (!result) throw new NotFoundException('ვაუჩერი ვერ მოიძებნა');
  }

  /**
   * Admin: batch create vouchers
   */
  async batchCreate(data: {
    amount: 100 | 200 | 500;
    currency: 'GEL' | 'USD' | 'EUR';
    count: number;
  }): Promise<VoucherDocument[]> {
    const { amount, currency, count } = data;
    if (count < 1 || count > 100) {
      throw new BadRequestException('Count must be between 1 and 100');
    }

    const vouchers: VoucherDocument[] = [];
    for (let i = 0; i < count; i++) {
      const v = await this.create({ amount, currency });
      vouchers.push(v);
    }
    return vouchers;
  }
}
