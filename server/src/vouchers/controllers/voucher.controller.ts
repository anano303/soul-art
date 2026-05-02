import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { VoucherService } from '../services/voucher.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '../../types/role.enum';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { UserDocument } from '../../users/schemas/user.schema';
import { OrdersService } from '../../orders/services/orders.service';
import { PaymentsService } from '../../payments/payments.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('vouchers')
export class VoucherController {
  constructor(
    private readonly voucherService: VoucherService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async create(
    @Body()
    body: {
      amount: 100 | 200 | 500;
      currency: 'GEL' | 'USD' | 'EUR';
      assignedTo?: string;
    },
  ) {
    return this.voucherService.create(body);
  }

  @Post('batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async batchCreate(
    @Body()
    body: {
      amount: 100 | 200 | 500;
      currency: 'GEL' | 'USD' | 'EUR';
      count: number;
    },
  ) {
    return this.voucherService.batchCreate(body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('currency') currency?: string,
    @Query('isUsed') isUsed?: string,
  ) {
    const isUsedBool =
      isUsed === 'true' ? true : isUsed === 'false' ? false : undefined;
    return this.voucherService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      currency,
      isUsedBool,
    );
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param('id') id: string) {
    await this.voucherService.deactivate(id);
  }

  // ─── Public / user endpoints ──────────────────────────────────────────────

  /**
   * Validate a voucher code before checkout.
   * Requires currency query param to check compatibility.
   */
  @Get('validate')
  async validate(
    @Query('code') code: string,
    @Query('currency') currency: string,
  ) {
    if (!code || !currency) {
      return { valid: false, message: 'კოდი და ვალუტა სავალდებულოა' };
    }
    return this.voucherService.validate(code, currency.toUpperCase());
  }

  // ─── Voucher purchase (buy as product) ───────────────────────────────────

  /**
   * Initiate a voucher purchase: creates a pending order + BOG payment URL.
   * Requires authentication. Returns { orderId, redirectUrl }.
   */
  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  async purchase(
    @Body()
    body: {
      amount: 100 | 200 | 500;
      currency: 'GEL' | 'USD' | 'EUR';
    },
    @CurrentUser() user: UserDocument,
  ) {
    const { amount, currency } = body;

    if (![100, 200, 500].includes(amount)) {
      return { error: 'Amount must be 100, 200, or 500' };
    }
    if (!['GEL', 'USD', 'EUR'].includes(currency)) {
      return { error: 'Currency must be GEL, USD, or EUR' };
    }

    const externalOrderId = `voucher_${uuidv4()}`;

    // Create a pending voucher order in DB
    const order = await this.ordersService.createVoucherOrder({
      amount,
      currency,
      userId: user._id.toString(),
      externalOrderId,
    });

    // Create BOG payment
    const paymentData = {
      customer: {
        firstName: user.ownerFirstName || user.name || 'Customer',
        lastName: user.ownerLastName || '',
        personalId: '000000000',
        address: 'Digital',
        phoneNumber: user.phoneNumber || '',
        email: user.email || '',
      },
      product: {
        productName: `SoulArt ვაუჩერი ${amount} ${currency}`,
        productId: order._id.toString(),
        unitPrice: amount,
        quantity: 1,
        totalPrice: amount,
      },
      successUrl: `${process.env.ALLOWED_ORIGINS?.split(',')[0]?.trim()}/checkout/success?orderId=${order._id.toString()}&voucher=1`,
      failUrl: `${process.env.ALLOWED_ORIGINS?.split(',')[0]?.trim()}/checkout/fail?orderId=${order._id.toString()}`,
    };

    const bogResult = await this.paymentsService.createPayment(paymentData);

    // Store BOG externalOrderId on the order
    await this.paymentsService.updateOrderWithExternalId(
      order._id.toString(),
      bogResult.uniqueId,
    );

    return {
      orderId: order._id.toString(),
      redirectUrl: bogResult.redirect_url,
    };
  }
}
