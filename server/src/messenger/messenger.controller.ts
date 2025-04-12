import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { WebhookVerificationDto, WebhookEventDto } from './dto/webhook-event.dto';
import { Public } from '../auth/decorators/public.decorator';
import { MessengerService } from './messenger.service';

@ApiTags('messenger')
@Controller('messenger')
export class MessengerController {
  private readonly logger = new Logger(MessengerController.name);

  constructor(private readonly messengerService: MessengerService) {}

  @Get('webhook')
  @Public()
  @ApiOperation({ summary: 'Verify webhook for Facebook Messenger' })
  @ApiResponse({ status: 200, description: 'Returns the challenge string if verification is successful' })
  @ApiResponse({ status: 403, description: 'Verification token is invalid' })
  verifyWebhook(@Query() query, @Res() res: Response): void {
    // Log the raw query params to debug
    this.logger.log(`Raw webhook verification query: ${JSON.stringify(query)}`);
    
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    
    this.logger.log(`Webhook verification details - Mode: ${mode}, Token: ${token}, Challenge: ${challenge}`);
    
    // Check if this is a verification request
    if (mode === 'subscribe' && token) {
      const verifyToken = this.messengerService.getVerifyToken();
      this.logger.log(`Expected token: ${verifyToken}, Received token: ${token}`);
      
      if (token === verifyToken) {
        this.logger.log(`Webhook verified successfully with challenge: ${challenge}`);
        // Important: Return the challenge as plain text, not JSON
        res.status(200).send(challenge);
      } else {
        this.logger.warn('Webhook verification failed - invalid token');
        res.status(403).send('Error, wrong validation token');
      }
    } else {
      this.logger.warn(`Invalid webhook verification request: incorrect mode (${mode}) or missing token`);
      res.status(400).send('Error, invalid request');
    }
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle incoming messages from Facebook Messenger' })
  @ApiResponse({ status: 200, description: 'Message processed' })
  async handleWebhookEvent(@Body() webhookEvent: WebhookEventDto): Promise<{ status: string }> {
    this.logger.log(`Webhook event received: ${JSON.stringify(webhookEvent)}`);
    
    await this.messengerService.processWebhook(webhookEvent);
    
    // Always return a 200 OK to Facebook quickly to avoid timeouts
    return { status: 'ok' };
  }

  @Get('setup')
  @ApiOperation({ summary: 'Set up messenger profile and subscribe to webhooks' })
  @ApiResponse({ status: 200, description: 'Setup completed' })
  async setupMessenger(): Promise<any> {
    this.logger.log('Setting up messenger');
    
    try {
      // Get the current domain from config
      const domain = process.env.ALLOWED_ORIGINS?.split(',')[0] || 'https://soulart.ge';
      
      // Setup messenger profile (greeting, get started button, whitelist domain)
      const profileSetup = await this.messengerService.setupMessengerProfile(domain);
      
      // Subscribe to webhooks
      const webhookSubscription = await this.messengerService.subscribeWebhook();
      
      return {
        success: true,
        message: 'Messenger setup completed',
        details: { profileSetup, webhookSubscription }
      };
    } catch (error) {
      this.logger.error(`Messenger setup failed: ${error.message}`);
      return {
        success: false,
        message: 'Messenger setup failed',
        error: error.message
      };
    }
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get the current messenger profile configuration' })
  @ApiResponse({ status: 200, description: 'Returns the messenger profile' })
  async getMessengerProfile(): Promise<any> {
    return this.messengerService.getMessengerProfile();
  }

  @Get('test-verification')
  @ApiOperation({ summary: 'Test webhook verification' })
  @ApiResponse({ status: 200, description: 'Test verification results' })
  async testVerification(): Promise<any> {
    this.logger.log('Testing webhook verification');
    try {
      const result = await this.messengerService.testVerification();
      return {
        success: true,
        message: 'Webhook test completed',
        result,
      };
    } catch (error) {
      this.logger.error(`Webhook test failed: ${error.message}`);
      return {
        success: false,
        message: 'Webhook test failed',
        error: error.message,
      };
    }
  }
}
