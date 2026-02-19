import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ShippingCountriesService } from './shipping-countries.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../types/role.enum';

@Controller('shipping-countries')
export class ShippingCountriesController {
  constructor(private readonly shippingCountriesService: ShippingCountriesService) {}

  // Public endpoint - get all active shipping countries
  @Get()
  async findAll() {
    return this.shippingCountriesService.findAll();
  }

  // Public endpoint - get specific country
  @Get(':countryCode')
  async findOne(@Param('countryCode') countryCode: string) {
    const country = await this.shippingCountriesService.findOne(countryCode);
    if (!country) {
      return { error: 'Country not found' };
    }
    return country;
  }

  // Admin only - create new shipping country
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async create(
    @Body() body: {
      countryCode: string;
      countryName: string;
      cost: number;
      isFree?: boolean;
    },
  ) {
    try {
      const country = await this.shippingCountriesService.create(body);
      return { success: true, country };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Admin only - update shipping country
  @Put(':countryCode')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async update(
    @Param('countryCode') countryCode: string,
    @Body() body: {
      countryName?: string;
      cost?: number;
      isFree?: boolean;
      isActive?: boolean;
    },
  ) {
    const country = await this.shippingCountriesService.update(countryCode, body);
    if (!country) {
      return { success: false, error: 'Country not found' };
    }
    return { success: true, country };
  }

  // Admin only - delete (soft delete) shipping country
  @Delete(':countryCode')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async delete(@Param('countryCode') countryCode: string) {
    const success = await this.shippingCountriesService.delete(countryCode);
    return { success };
  }

  // Admin only - initialize default countries
  @Post('initialize/defaults')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async initializeDefaults() {
    await this.shippingCountriesService.initializeDefaultCountries();
    return { success: true, message: 'Default countries initialized' };
  }
}
