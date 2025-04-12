import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class MessengerService {
  private readonly logger = new Logger(MessengerService.name);
  private readonly pageAccessToken: string;
  private readonly verifyToken: string;
  private readonly pageId: string;
  private readonly serverBaseUrl: string;
  private readonly facebookApiUrl = 'https://graph.facebook.com/v18.0';

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.pageAccessToken = this.configService.get<string>('FACEBOOK_PAGE_ACCESS_TOKEN');
    this.verifyToken = this.configService.get<string>('FACEBOOK_VERIFY_TOKEN');
    this.pageId = this.configService.get<string>('FACEBOOK_PAGE_ID');
    this.serverBaseUrl = this.configService.get<string>('SERVER_BASE_URL') || 'https://seal-app-tilvb.ondigitalocean.app';
    
    this.logger.log(`Messenger service initialized with Page ID: ${this.pageId}`);
    this.logger.log(`Server base URL: ${this.serverBaseUrl}`);
  }

  /**
   * Get the verify token for Facebook webhook verification
   */
  getVerifyToken(): string {
    const token = this.verifyToken || 'soulart_messenger_webhook_verify_token';
    this.logger.log(`Using verification token: ${token}`);
    return token;
  }

  /**
   * Test webhook verification by making an actual HTTP request
   * This helps diagnose webhook verification issues
   */
  async testVerification(): Promise<any> {
    try {
      const webhookUrl = `${this.serverBaseUrl}/v1/messenger/webhook`;
      const verifyToken = this.getVerifyToken();
      const challenge = 'test_challenge_string';
      
      this.logger.log(`Testing webhook verification with URL: ${webhookUrl}`);
      
      const testUrl = new URL(webhookUrl);
      testUrl.searchParams.append('hub.mode', 'subscribe');
      testUrl.searchParams.append('hub.verify_token', verifyToken);
      testUrl.searchParams.append('hub.challenge', challenge);
      
      const { data, status } = await firstValueFrom(
        this.httpService
          .get(testUrl.toString())
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(`Test verification failed: ${error.message}`);
              throw error;
            }),
          ),
      );
      
      return {
        status,
        data,
        success: data === challenge,
        message: data === challenge ? 'Verification successful' : 'Challenge response mismatch',
      };
    } catch (error) {
      this.logger.error(`Error during test verification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process webhook messages from Facebook
   */
  async processWebhook(body: any): Promise<void> {
    this.logger.log('Processing webhook event');
    
    if (!body || body.object !== 'page') {
      this.logger.warn(`Received non-page webhook event: ${body?.object}`);
      return;
    }

    if (!body.entry || !Array.isArray(body.entry)) {
      this.logger.warn('No entries in webhook payload');
      return;
    }

    for (const entry of body.entry) {
      const webhookEvent = entry.messaging?.[0];
      if (!webhookEvent) {
        this.logger.warn('No messaging event found in webhook entry');
        continue;
      }

      const senderId = webhookEvent.sender?.id;
      if (!senderId) {
        this.logger.warn('No sender ID in webhook event');
        continue;
      }

      this.logger.log(`Processing message from sender: ${senderId}`);

      if (webhookEvent.message) {
        await this.handleMessage(senderId, webhookEvent.message);
      } else if (webhookEvent.postback) {
        await this.handlePostback(senderId, webhookEvent.postback);
      }
    }
  }

  private async handleMessage(senderId: string, receivedMessage: any): Promise<void> {
    this.logger.log(`Handling message from ${senderId}`);
    
    let response: string;

    if (receivedMessage.text) {
      response = `გმადლობთ მესიჯისთვის: "${receivedMessage.text}". მალე დაგიკავშირდებათ ჩვენი წარმომადგენელი.`;
    } else if (receivedMessage.attachments) {
      response = 'გმადლობთ თქვენი ფაილისთვის. მალე დაგიკავშირდებათ ჩვენი წარმომადგენელი.';
    } else {
      response = 'გმადლობთ თქვენი შეტყობინებისთვის. მალე დაგიკავშირდებათ ჩვენი წარმომადგენელი.';
    }

    await this.sendTextMessage(senderId, response);
  }

  private async handlePostback(senderId: string, postback: any): Promise<void> {
    this.logger.log(`Handling postback from ${senderId}`);
    
    const payload = postback.payload;
    
    let response: string;
    
    if (payload === 'GET_STARTED') {
      response = 'მოგესალმებით SoulArt-ში! როგორ შეგვიძლია დაგეხმაროთ დღეს?';
    } else {
      response = 'გმადლობთ თქვენი ინტერესისთვის. როგორ შეგვიძლია დაგეხმაროთ?';
    }
    
    await this.sendTextMessage(senderId, response);
  }

  async sendTextMessage(recipientId: string, text: string): Promise<void> {
    this.logger.log(`Sending message to ${recipientId}`);
    
    const messageData = {
      recipient: {
        id: recipientId,
      },
      message: {
        text,
      },
    };

    await this.callSendAPI(messageData);
  }

  private async callSendAPI(messageData: any): Promise<void> {
    const url = `${this.facebookApiUrl}/me/messages`;
    
    try {
      const { data } = await firstValueFrom(
        this.httpService
          .post(url, messageData, {
            params: {
              access_token: this.pageAccessToken,
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(`Error sending message: ${error.response?.data || error.message}`);
              throw error;
            }),
          ),
      );
      
      this.logger.log(`Message sent successfully to ${messageData.recipient.id}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to send message to ${messageData.recipient.id}:`, error);
      throw error;
    }
  }

  async getMessengerProfile(): Promise<any> {
    this.logger.log('Fetching messenger profile');
    const url = `${this.facebookApiUrl}/me/messenger_profile`;
    
    try {
      const { data } = await firstValueFrom(
        this.httpService
          .get(url, {
            params: {
              access_token: this.pageAccessToken,
              fields: 'whitelisted_domains,greeting,get_started',
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(`Error getting messenger profile: ${error.response?.data || error.message}`);
              throw error;
            }),
          ),
      );
      
      return data;
    } catch (error) {
      this.logger.error('Failed to get messenger profile:', error);
      throw error;
    }
  }

  async setupMessengerProfile(domain: string): Promise<any> {
    this.logger.log(`Setting up messenger profile for domain: ${domain}`);
    const url = `${this.facebookApiUrl}/me/messenger_profile`;
    
    const profileData = {
      whitelisted_domains: [domain],
      get_started: {
        payload: 'GET_STARTED',
      },
      greeting: [
        {
          locale: 'default',
          text: 'მოგესალმებით SoulArt-ში! როგორ შეგვიძლია დაგეხმაროთ დღეს?',
        },
        {
          locale: 'en_US',
          text: 'Welcome to SoulArt! How can we help you today?',
        },
      ],
    };
    
    try {
      const { data } = await firstValueFrom(
        this.httpService
          .post(url, profileData, {
            params: {
              access_token: this.pageAccessToken,
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(`Error setting up messenger profile: ${error.response?.data || error.message}`);
              throw error;
            }),
          ),
      );
      
      return data;
    } catch (error) {
      this.logger.error('Failed to set up messenger profile:', error);
      throw error;
    }
  }

  async subscribeWebhook(): Promise<any> {
    this.logger.log(`Subscribing to Facebook webhook for page ${this.pageId}`);
    const url = `${this.facebookApiUrl}/${this.pageId}/subscribed_apps`;
    
    try {
      const { data } = await firstValueFrom(
        this.httpService
          .post(url, {}, {
            params: {
              access_token: this.pageAccessToken,
              subscribed_fields: 'messages,messaging_postbacks,messaging_optins',
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(`Error subscribing to webhook: ${error.response?.data || error.message}`);
              throw error;
            }),
          ),
      );
      
      this.logger.log(`Webhook subscription successful: ${JSON.stringify(data)}`);
      return { success: true, data };
    } catch (error) {
      this.logger.error('Failed to subscribe to webhook:', error);
      throw error;
    }
  }
}
