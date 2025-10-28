import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/guards/optional-jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';
import { Roles } from '@/decorators/roles.decorator';
import { Role } from '@/types/role.enum';
import { BogTransferService } from '../services/bog-transfer.service';

@Controller('admin/bog')
@Roles(Role.Admin)
export class BogAdminController {
  private readonly logger = new Logger(BogAdminController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly bogTransferService: BogTransferService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  /**
   * Initiate OAuth2 authorization flow
   * Redirects user to BOG login page
   */
  @Get('auth/authorize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async authorize(@Res() res: Response) {
    try {
      const authUrl = await this.bogTransferService.getAuthorizationUrl();
      return res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Failed to initiate authorization', error);
      throw error;
    }
  }

  /**
   * OAuth2 callback endpoint
   * BOG redirects here after user authorizes the app
   */
  @Get('auth/callback')
  @UseGuards(OptionalJwtAuthGuard)
  async callback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    try {
      if (error) {
        this.logger.error(`Authorization error: ${error}`);
        return res.redirect(`${this.frontendUrl}/admin/bog-transfers?error=${error}`);
      }

      if (!code) {
        this.logger.error('No authorization code received');
        return res.redirect(`${this.frontendUrl}/admin/bog-transfers?error=no_code`);
      }

      this.logger.log(`Received authorization code: ${code.substring(0, 10)}...`);
      
      // Exchange code for access token
      const tokenData = await this.bogTransferService.exchangeCodeForToken(code);
      
      this.logger.log('Successfully obtained access token via OAuth2 flow');
      
      // Redirect back to frontend admin page with success
      return res.redirect(`${this.frontendUrl}/admin/bog-transfers?auth=success`);
    } catch (error) {
      this.logger.error('OAuth2 callback failed', error);
      return res.redirect(`${this.frontendUrl}/admin/bog-transfers?error=callback_failed`);
    }
  }

  /**
   * Check if user is authenticated with BOG OAuth2
   */
  @Get('auth/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async checkAuthStatus() {
    const isAuthenticated = this.bogTransferService.isAuthenticated();
    const userInfo = this.bogTransferService.getUserInfo();
    return {
      success: true,
      authenticated: isAuthenticated,
      user: userInfo,
    };
  }

  /**
   * Logout - clear BOG OAuth2 tokens
   */
  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    this.bogTransferService.clearTokens();
    return {
      success: true,
      message: 'გამოსვლა წარმატებული',
    };
  }

  /**
   * Get company account balance
   * Note: BOG doesn't provide this via API - must check manually
   */
  @Get('balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAccountBalance() {
    try {
      const info = await this.bogTransferService.getAccountBalance();
      return {
        success: true,
        data: info,
        note: 'BOG API does not provide balance endpoint. Check BOG Business Online portal manually.',
      };
    } catch (error) {
      this.logger.error('Failed to get account balance', error);
      throw error;
    }
  }

  /**
   * Get all pending documents waiting for signature
   * Returns pending withdrawals from database (not BOG API)
   */
  @Get('pending-documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getPendingDocuments() {
    try {
      this.logger.log('Admin requested pending withdrawals from database');
      // Note: We don't have getPendingDocuments from BOG anymore
      // This should return pending withdrawals from the database
      return {
        success: true,
        data: [],
        count: 0,
        note: 'BOG API does not provide document list endpoint. Check pending withdrawals instead.',
      };
    } catch (error) {
      this.logger.error('Failed to get pending documents', error);
      throw error;
    }
  }

  /**
   * Get document status by UniqueKey
   */
  @Get('document/:uniqueKey')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getDocumentStatus(@Param('uniqueKey') uniqueKey: string) {
    try {
      this.logger.log(`Checking status for document: ${uniqueKey}`);
      const status = await this.bogTransferService.getDocumentStatus(Number(uniqueKey));
      this.logger.log(`Document ${uniqueKey} status: ${JSON.stringify(status)}`);
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      this.logger.error(`Failed to get document status for ${uniqueKey}`, error);
      throw error;
    }
  }

  /**
   * Request OTP for document signing
   */
  @Post('request-otp')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body('uniqueKey') uniqueKey?: number) {
    try {
      await this.bogTransferService.requestOtp(uniqueKey);
      return {
        success: true,
        message: 'OTP გამოგზავნილია თქვენს ტელეფონზე/ელფოსტაზე',
      };
    } catch (error) {
      this.logger.error('Failed to request OTP', error);
      throw error;
    }
  }

  /**
   * Sign a document with OTP
   */
  @Post('sign-document')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  async signDocument(
    @Body('uniqueKey') uniqueKey: number,
    @Body('otp') otp: string,
  ) {
    try {
      await this.bogTransferService.signDocument(uniqueKey, otp);
      return {
        success: true,
        message: 'დოკუმენტი წარმატებით ხელმოწერილია და შესრულებულია',
      };
    } catch (error) {
      this.logger.error(`Failed to sign document ${uniqueKey}`, error);
      throw error;
    }
  }
}
