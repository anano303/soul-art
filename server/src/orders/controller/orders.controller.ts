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

  @UseGuards(RolesGuard)
  @Get()
  async getOrders() {
    return this.ordersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('myorders')
  async getUserOrders(
    @CurrentUser() user: UserDocument,
    @Query('status') status?: string,
  ) {
    if (status) {
      return this.ordersService.findUserOrdersByStatus(user._id.toString(), status);
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
