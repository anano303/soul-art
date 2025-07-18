import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  Query,
} from '@nestjs/common';
import { RolesGuard } from '@/guards/roles.guard';
import { OrdersService } from '../services/orders.service';
import { StockReservationService } from '../services/stock-reservation.service';
import { UserDocument } from '@/users/schemas/user.schema';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { Roles } from '@/decorators/roles.decorator';
import { Role } from '@/types/role.enum';

@Controller('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private stockReservationService: StockReservationService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createOrder(@Body() body: any, @CurrentUser() user: UserDocument) {
    return this.ordersService.create(body, user._id.toString());
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Seller)
  @Get()
  async getOrders(@CurrentUser() user: UserDocument) {
    console.log('Getting orders for user:', user.email, 'Role:', user.role);

    // If user is an admin, return all orders
    if (user.role === Role.Admin) {
      console.log('User is admin, fetching all orders');
      return this.ordersService.findAll();
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

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return this.ordersService.findById(id);
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
}
