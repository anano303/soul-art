import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Param } from '@nestjs/common';
import { EtsyService } from './etsy.service';
import { EtsyListingService } from './etsy-listing.service';
import { UpdateEtsySettingsDto } from './dto/update-etsy-settings.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../types/role.enum';

@ApiTags('etsy')
@Controller('etsy')
export class EtsyController {
  constructor(
    private readonly etsyService: EtsyService,
    private readonly etsyListingService: EtsyListingService,
  ) {}

  /**
   * Etsy კავშირის სტატუსი (კონფიგურაცია + OAuth)
   */
  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Get Etsy configuration and connection status' })
  async getStatus() {
    return this.etsyService.getConnectionStatus();
  }

  /**
   * Keystring-ის შემოწმება Etsy-სთან (OAuth არ სჭირდება)
   */
  @Get('ping')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Verify the Etsy keystring (no OAuth required)' })
  async ping() {
    return this.etsyService.ping();
  }

  /**
   * OAuth ავტორიზაციის URL — ერთჯერადი setup ადმინისთვის,
   * SoulArt-ის Etsy მაღაზიის დასაკავშირებლად
   */
  @Get('auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Get Etsy OAuth authorization URL (one-time setup)' })
  async getAuthUrl() {
    const authUrl = await this.etsyService.generateAuthUrl();
    return {
      authUrl,
      message: 'Visit this URL while logged into the SoulArt Etsy account',
    };
  }

  /**
   * OAuth Callback — Etsy-ს redirect-ის შემდეგ.
   * ეს URL ზუსტად უნდა ემთხვეოდეს ETSY_REDIRECT_URI-ს
   * და Etsy app-ში რეგისტრირებულ Callback URL-ს.
   */
  @Get('oauth/callback')
  @ApiOperation({ summary: 'Etsy OAuth callback endpoint' })
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    if (error) {
      return res
        .status(400)
        .send(this.renderResultPage(false, errorDescription || error));
    }
    if (!code || !state) {
      throw new HttpException(
        'Authorization code and state are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const status = await this.etsyService.handleOAuthCallback(code, state);
      const shopLine = status.shopName
        ? `Connected shop: <b>${status.shopName}</b> (ID: ${status.shopId})`
        : 'Account connected, but no Etsy shop was found on it yet.';
      return res.send(this.renderResultPage(true, shopLine));
    } catch (err) {
      return res.status(500).send(this.renderResultPage(false, err.message));
    }
  }

  /**
   * ტოკენების იძულებითი განახლება (ადმინის Refresh ღილაკი)
   */
  @Post('refresh-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Force-refresh the Etsy OAuth tokens' })
  async refreshToken() {
    const status = await this.etsyService.forceRefreshToken();
    return { success: true, ...status };
  }

  /**
   * Etsy-ს პარამეტრები — listing fee, საკომისიო, ჩართვა/გამორთვა.
   * GET ხელმისაწვდომია ავტორიზებული მომხმარებლებისთვის (გამყიდველებს
   * დასჭირდებათ ფასის კალკულაციისთვის), შეცვლა — მხოლოდ ადმინს.
   */
  @Get('settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Etsy marketplace settings' })
  async getSettings() {
    return this.etsyService.getSettings();
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Update Etsy marketplace settings (admin)' })
  async updateSettings(@Body() dto: UpdateEtsySettingsDto) {
    const settings = await this.etsyService.updateSettings(dto);
    return { success: true, ...settings };
  }

  /**
   * Etsy კავშირის გაუქმება
   */
  @Delete('connection')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Disconnect the Etsy shop' })
  async disconnect() {
    await this.etsyService.disconnect();
    return { success: true, message: 'Etsy connection removed' };
  }

  /**
   * დაკავშირებული მაღაზიის ინფორმაცია
   */
  @Get('shop')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Get connected Etsy shop info' })
  async getShop() {
    return this.etsyService.getShop();
  }

  /**
   * პროდუქტის Etsy listing-ის გადახედვა — mapping, ფასი, ბლოკერები.
   * გამყიდველი ხედავს საკუთარ პროდუქტებზე, ადმინი — ყველაზე.
   */
  @Get('products/:productId/preview')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Preview how a product maps to an Etsy listing' })
  async previewListing(
    @Param('productId') productId: string,
    @CurrentUser() user: any,
  ) {
    return this.etsyListingService.previewListing(productId, user);
  }

  /**
   * პროდუქტის Etsy-ზე განთავსება (draft → images → activate → fee)
   */
  @Post('products/:productId/publish')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Publish a product to the SoulArt Etsy shop' })
  async publishProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: any,
  ) {
    return this.etsyListingService.publishProduct(productId, user);
  }

  /**
   * ჩემი Etsy listing-ები (ადმინისთვის — ყველა)
   */
  @Get('listings/mine')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Etsy listings for the current seller' })
  async getMyListings(@CurrentUser() user: any) {
    return this.etsyListingService.getMyListings(user);
  }

  private renderResultPage(success: boolean, detail: string): string {
    return `
      <html>
        <body style="font-family: sans-serif; text-align: center; padding-top: 60px;">
          <h2>${success ? '✅ Etsy Authorization Successful!' : '❌ Etsy Authorization Failed'}</h2>
          <p>${detail}</p>
          <p>You can close this window now.</p>
        </body>
      </html>
    `;
  }
}
