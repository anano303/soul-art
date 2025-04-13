import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class MessengerService {
  private readonly logger = new Logger(MessengerService.name);
  private readonly pageAccessToken: string;
  private readonly verifyToken: string;
  private readonly pageId: string;
  
  constructor(private configService: ConfigService) {
    this.pageAccessToken = this.configService.get<string>('FACEBOOK_PAGE_ACCESS_TOKEN');
    this.verifyToken = this.configService.get<string>('FACEBOOK_VERIFY_TOKEN');
    this.pageId = this.configService.get<string>('FACEBOOK_PAGE_ID');
    
    if (!this.pageAccessToken || this.pageAccessToken === 'your_valid_page_access_token_here') {
      this.logger.warn('FACEBOOK_PAGE_ACCESS_TOKEN is not properly set - Facebook messaging functionality will not work');
    }
    
    if (this.pageAccessToken && this.verifyToken && this.pageId) {
      this.logger.log('Facebook Messenger configuration loaded');
      this.logger.log(`Page ID: ${this.pageId}`);
    }
  }

  verifyWebhook(mode: string, token: string): boolean {
    this.logger.log(`Verifying webhook: mode=${mode}, token=${token ? '******' : 'undefined'}, expected=${this.verifyToken ? '******' : 'undefined'}`);
    return mode === 'subscribe' && token === this.verifyToken;
  }

  async handleMessage(sender: string, message: any): Promise<void> {
    try {
      this.logger.log(`Handling message from ${sender}`);
      
      if (!this.pageAccessToken || this.pageAccessToken === 'your_valid_page_access_token_here') {
        this.logger.warn('Cannot send message: Valid page access token is not configured');
        return;
      }
      
      // Only process text messages
      if (message.text) {
        await this.sendTextMessage(sender, `Thank you for contacting SoulArt! A team member will respond to your message shortly.`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle message: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendTextMessage(recipientId: string, text: string): Promise<void> {
    if (!this.pageAccessToken || this.pageAccessToken === 'your_valid_page_access_token_here') {
      this.logger.error('Cannot send message: Valid page access token is not configured');
      return;
    }

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v19.0/me/messages`,
        {
          recipient: { id: recipientId },
          message: { text },
        },
        {
          params: { access_token: this.pageAccessToken },
        }
      );
      
      this.logger.log(`Message sent successfully: ${response.status}`);
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.response?.data?.error || error.message}`);
      throw error;
    }
  }
}
