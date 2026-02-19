import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../types/role.enum';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Public endpoint - anyone can get USD rate
  @Get('usd-rate')
  async getUsdRate() {
    const rate = await this.settingsService.getUsdRate();
    return { rate };
  }

  // Admin only - update USD rate
  @Put('usd-rate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async setUsdRate(@Body('rate') rate: number) {
    if (!rate || rate <= 0) {
      return { error: 'Invalid rate', success: false };
    }
    const newRate = await this.settingsService.setUsdRate(rate);
    return { rate: newRate, success: true };
  }

  // Public endpoint - get foreign payment fee
  @Get('foreign-payment-fee')
  async getForeignPaymentFee() {
    const fee = await this.settingsService.getForeignPaymentFee();
    return { fee };
  }

  // Admin only - update foreign payment fee
  @Put('foreign-payment-fee')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async setForeignPaymentFee(@Body('fee') fee: number) {
    if (fee == null || fee < 0) {
      return { error: 'Invalid fee percentage', success: false };
    }
    const newFee = await this.settingsService.setForeignPaymentFee(fee);
    return { fee: newFee, success: true };
  }

  // Admin only - get all settings
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }
}
