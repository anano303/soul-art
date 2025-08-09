import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { BalanceService } from '../services/balance.service';
import { WithdrawalRequestDto } from '../dtos/balance.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '../../types/role.enum';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { UserDocument } from '../schemas/user.schema';

@Controller('balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  /**
   * სელერის ბალანსის მიღება
   */
  @Get('seller')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  async getSellerBalance(@CurrentUser() user: UserDocument) {
    const sellerId = user._id.toString();
    const balance = await this.balanceService.getSellerBalance(sellerId);
    return balance;
  }

  /**
   * სელერის ტრანზაქციების ისტორია
   */
  @Get('seller/transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  async getSellerTransactions(
    @CurrentUser() user: UserDocument,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const sellerId = user._id.toString();
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    return this.balanceService.getSellerTransactions(
      sellerId,
      pageNum,
      limitNum,
    );
  }

  /**
   * ყველა სელერის ბალანსები (ადმინისთვის)
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getAllSellerBalances(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    return this.balanceService.getAllSellerBalances(pageNum, limitNum);
  }

  /**
   * კონკრეტული სელერის ბალანსი (ადმინისთვის)
   */
  @Get('admin/seller/:sellerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getSellerBalanceByAdmin(@Param('sellerId') sellerId: string) {
    return this.balanceService.getSellerBalance(sellerId);
  }

  /**
   * კონკრეტული სელერის ტრანზაქციები (ადმინისთვის)
   */
  @Get('admin/seller/:sellerId/transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getSellerTransactionsByAdmin(
    @Param('sellerId') sellerId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    return this.balanceService.getSellerTransactions(
      sellerId,
      pageNum,
      limitNum,
    );
  }

  /**
   * თანხის გატანის მოთხოვნა
   */
  @Post('withdrawal/request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  async requestWithdrawal(
    @CurrentUser() user: UserDocument,
    @Body() withdrawalDto: WithdrawalRequestDto,
  ) {
    const sellerId = user._id.toString();
    const { amount } = withdrawalDto;

    if (!amount || amount <= 0) {
      throw new BadRequestException('თანხა უნდა იყოს დადებითი რიცხვი');
    }

    await this.balanceService.requestWithdrawal(sellerId, amount);

    return {
      success: true,
      message: 'თანხის გატანის მოთხოვნა წარმატებით გაიგზავნა',
    };
  }
}
