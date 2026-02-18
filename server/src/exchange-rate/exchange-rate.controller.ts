import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../types/role.enum';

@Controller('exchange-rate')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  /**
   * Get latest exchange rates (public endpoint)
   */
  @Get('latest')
  async getLatestRates() {
    const rates = await this.exchangeRateService.getLatestRates();
    return {
      success: true,
      rates, // { USD: 0.37, EUR: 0.34 }
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Manually trigger exchange rate update (admin only)
   */
  @Post('refresh')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async refreshRates() {
    await this.exchangeRateService.fetchFromNBG();
    const rates = await this.exchangeRateService.getLatestRates();
    
    return {
      success: true,
      message: 'Exchange rates updated successfully',
      rates,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get price conversion breakdown for testing (admin only)
   */
  @Get('test-conversion')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async testConversion() {
    const testPrice = 100; // 100 GEL
    const foreignFee = 20; // 20%

    const [usdBreakdown, eurBreakdown] = await Promise.all([
      this.exchangeRateService.getPriceBreakdown(testPrice, 'USD', foreignFee),
      this.exchangeRateService.getPriceBreakdown(testPrice, 'EUR', foreignFee),
    ]);

    return {
      success: true,
      test: {
        basePrice: testPrice,
        foreignFee: `${foreignFee}%`,
      },
      conversions: {
        USD: usdBreakdown,
        EUR: eurBreakdown,
      },
    };
  }
}
