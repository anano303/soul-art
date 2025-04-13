import { Controller, Get, Post, Body, Query, Logger, HttpStatus, HttpException, Res } from '@nestjs/common';
import { MessengerService } from './messenger.service';
import { Response } from 'express';

@Controller('messenger')
export class MessengerController {
  private readonly logger = new Logger(MessengerController.name);

  constructor(private readonly messengerService: MessengerService) {}

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response
  ): void {
    this.logger.log(`Webhook verification request received: mode=${mode}`);
    
    if (this.messengerService.verifyWebhook(mode, token)) {
      this.logger.log('Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      this.logger.warn('Webhook verification failed');
      res.status(403).send('Verification failed');
    }
  }

  @Post('webhook')
  async handleWebhook(@Body() data: any): Promise<{ status: string }> {
    try {
      this.logger.debug(`Webhook event received: ${JSON.stringify(data)}`);
      
      // Verify this is a page subscription
      if (data.object === 'page') {
        // Iterate over each entry - there may be multiple if batched
        for (const entry of data.entry) {
          const webhookEvent = entry.messaging?.[0];
          
          if (webhookEvent) {
            const senderId = webhookEvent.sender.id;
            
            if (webhookEvent.message) {
              await this.messengerService.handleMessage(senderId, webhookEvent.message);
            }
          }
        }
        return { status: 'ok' };
      }
      
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
