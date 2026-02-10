import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  Query,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { RolesGuard } from '@/guards/roles.guard';
import { OrdersService } from '../services/orders.service';
import { StockReservationService } from '../services/stock-reservation.service';
import { BalanceService } from '../../users/services/balance.service';
import { UserDocument } from '@/users/schemas/user.schema';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/guards/optional-jwt-auth.guard';
import { Roles } from '@/decorators/roles.decorator';
import { Role } from '@/types/role.enum';

@Controller('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private stockReservationService: StockReservationService,
    private balanceService: BalanceService,
  ) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  async createOrder(@Body() body: any, @CurrentUser() user?: UserDocument) {
    try {
      // Support both authenticated and guest checkout
      if (user) {
        // Authenticated user checkout
        return await this.ordersService.create(body, user._id.toString());
      } else {
        // Guest checkout - require guest info
        if (
          !body.guestInfo ||
          !body.guestInfo.email ||
          !body.guestInfo.phoneNumber ||
          !body.guestInfo.fullName
        ) {
          throw new BadRequestException(
            'Guest checkout requires email, phoneNumber, and fullName',
          );
        }
        return await this.ordersService.createGuestOrder(body);
      }
    } catch (error) {
      // If stock related error, format it properly for frontend
      if (error.message?.includes('Not enough stock')) {
        // Parse error message to extract product info
        const unavailableItems = this.parseStockError(error.message);

        throw new BadRequestException({
          message: 'ITEMS_UNAVAILABLE',
          unavailableItems,
        });
      }
      throw error;
    }
  }

  private parseStockError(errorMessage: string) {
    // Simple parsing - in real app you'd want more sophisticated parsing
    // For now, return a generic unavailable item structure
    return [
      {
        productId: null, // Would need to extract from error
        reason: 'insufficient_stock',
      },
    ];
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Seller, Role.AuctionAdmin)
  @Get()
  async getOrders(
    @CurrentUser() user: UserDocument,
    @Query('orderType') orderType?: string,
  ) {
    console.log('Getting orders for user:', user.email, 'Role:', user.role);

    // If user is auction_admin, only return auction orders
    if (user.role === Role.AuctionAdmin) {
      console.log('User is auction_admin, fetching only auction orders');
      return this.ordersService.findAll('auction');
    }

    // If user is an admin, return orders filtered by orderType
    if (user.role === Role.Admin) {
      console.log(
        'User is admin, fetching orders with type:',
        orderType || 'all',
      );
      return this.ordersService.findAll(orderType);
    }

    // If user is a seller, return only orders containing their products
    console.log('User is seller, fetching orders with seller products');
    return this.ordersService.findOrdersBySeller(user._id.toString());
  }

  @UseGuards(JwtAuthGuard)
  @Get('myorders')
  async getUserOrders(
    @CurrentUser() user: UserDocument,
    @Query('status') status?: string,
  ) {
    if (status) {
      return this.ordersService.findUserOrdersByStatus(
        user._id.toString(),
        status,
      );
    }
    return this.ordersService.findUserOrders(user._id.toString());
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async getOrder(
    @Param('id') id: string,
    @CurrentUser() user?: UserDocument,
    @Query('email') guestEmail?: string,
  ) {
    const order = await this.ordersService.findById(id);

    // If user is authenticated, check if order belongs to them
    if (user) {
      if (order.user && order.user.toString() === user._id.toString()) {
        return order;
      }
      // If user is admin or seller, allow access
      if (user.role === Role.Admin || user.role === Role.Seller) {
        return order;
      }
    }

    // For guest orders, allow public access (no authentication required)
    // Guest orders are public and can be viewed by anyone with the order ID
    if (order.isGuestOrder) {
      return order;
    }

    // If it's a registered user's order but user is not authenticated, deny access
    throw new UnauthorizedException(
      'You do not have permission to view this order',
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/pay')
  async updateOrderPayment(
    @Param('id') id: string,
    @Body() paymentResult: any,
  ) {
    return this.ordersService.updatePaid(id, paymentResult);
  }

  @UseGuards(RolesGuard)
  @Put(':id/deliver')
  async updateOrderDelivery(@Param('id') id: string) {
    return this.ordersService.updateDelivered(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body() body: { reason?: string },
  ) {
    return this.ordersService.cancelOrder(id, body.reason);
  }

  @UseGuards(RolesGuard)
  @Post('release-expired-stock')
  async releaseExpiredStock() {
    await this.stockReservationService.releaseExpiredStockReservations();
    return { message: 'Expired stock reservations released' };
  }

  /**
   * ადმინისთვის - შეკვეთისა და ბალანსის ინფორმაცია
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get(':id/balance-info')
  async getOrderBalanceInfo(@Param('id') orderId: string) {
    const order = await this.ordersService.findById(orderId);

    if (!order.isDelivered) {
      return {
        order,
        message: 'შეკვეთა ჯერ არ არის მიტანილი, ბალანსი არ არის განახლებული',
      };
    }

    // ყველა seller-ისთვის ამ შეკვეთიდან
    const sellerBalances = [];

    for (const item of order.orderItems) {
      // მივიღოთ პროდუქტის ინფორმაცია და seller
      const product = await this.balanceService.getProductDetails(
        item.productId,
      );
      if (product && product.user) {
        const sellerId = (product.user as any)._id.toString();
        const sellerBalance =
          await this.balanceService.getSellerBalance(sellerId);
        const sellerTransactions =
          await this.balanceService.getSellerTransactions(sellerId, 1, 5);

        sellerBalances.push({
          seller: product.user,
          product: {
            name: item.name,
            price: item.price,
            qty: item.qty,
            totalPrice: item.price * item.qty,
          },
          balance: sellerBalance,
          recentTransactions: sellerTransactions.transactions,
        });
      }
    }

    return {
      order,
      sellerBalances,
    };
  }
}
