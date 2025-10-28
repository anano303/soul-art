import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// BOG Document Status Codes
// https://api.bog.ge/docs/en/bonline/result/document-statuses
const BOG_STATUS_MAP = {
  'C': 'Cancelled by Response',
  'N': 'Incomplete',
  'D': 'Cancelled by Bank',
  'P': 'Completed',
  'A': 'To be Signed',
  'S': 'Signed',
  'T': 'In Progress',
  'R': 'Rejected',
  'Z': 'Sign In Progress',
};

interface BogTransferRequest {
  beneficiaryAccountNumber: string; // Seller's IBAN
  beneficiaryInn: string; // Seller's ID number
  beneficiaryName: string; // Seller's name
  amount: number; // Amount in GEL
  nomination: string; // Transfer reason
  beneficiaryBankCode?: string; // RTGS code (default BAGAGE22 for BOG)
}

interface BogTransferResponse {
  uniqueId: string;
  uniqueKey: number;
  resultCode: number;
  match?: number;
}

@Injectable()
export class BogTransferService {
  private readonly logger = new Logger(BogTransferService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly withdrawalClientId: string;
  private readonly withdrawalClientSecret: string;
  private readonly companyIban: string;
  private readonly apiUrl: string; // Base URL: https://api.businessonline.ge/api
  private readonly redirectUri: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private refreshToken: string | null = null;
  private idToken: string | null = null;
  private userInfo: any = null;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('BOG_BONLINE_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('BOG_BONLINE_CLIENT_SECRET');
    this.withdrawalClientId = this.configService.get<string>('BOG_WITHDRAWAL_CLIENT_ID');
    this.withdrawalClientSecret = this.configService.get<string>('BOG_WITHDRAWAL_CLIENT_SECRET');
    this.companyIban = this.configService.get<string>('BOG_COMPANY_IBAN');
    this.apiUrl = this.configService.get<string>('BOG_API_URL');
    this.redirectUri = this.configService.get<string>('BOG_REDIRECT_URI');
  }

  /**
   * Generate OAuth2 authorization URL for user login
   * User will be redirected to this URL to approve the application
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: 'openid corp', // openid is needed to get id_token with user info
      redirect_uri: this.redirectUri,
      kc_locale: 'ka', // Georgian language
    });

    const authUrl = `https://account.bog.ge/auth/realms/bog/protocol/openid-connect/auth?${params.toString()}`;
    this.logger.log(`Generated authorization URL: ${authUrl}`);
    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   * Called after user authorizes and BOG redirects back with code
   */
  async exchangeCodeForToken(code: string): Promise<any> {
    try {
      const authEndpoint = 'https://account.bog.ge/auth/realms/bog/protocol/openid-connect/token';
      this.logger.log('Exchanging authorization code for access token');
      
      const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        authEndpoint,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.idToken = response.data.id_token; // JWT token with user info
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      this.logger.log('Successfully obtained OAuth2 access token');
      this.logger.debug(`Token expires in ${expiresIn} seconds`);
      this.logger.debug(`ID token present: ${!!this.idToken}`);
      if (this.idToken) {
        this.logger.debug(`ID token (first 50 chars): ${this.idToken.substring(0, 50)}...`);
      }
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange code for token');
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      throw new BadRequestException('Failed to obtain access token from authorization code');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new BadRequestException('No refresh token available. User needs to re-authorize.');
    }

    try {
      const authEndpoint = 'https://account.bog.ge/auth/realms/bog/protocol/openid-connect/token';
      this.logger.log('Refreshing access token');
      
      const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        authEndpoint,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.idToken = response.data.id_token;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      this.logger.log('Successfully refreshed access token');
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to refresh access token');
      // Clear all tokens so user will be prompted to re-authorize
      this.clearTokens();
      throw new BadRequestException('Session expired. Please re-authorize.');
    }
  }

  /**
   * Check if user is authenticated with OAuth2
   * Returns true if we have a valid access token OR a refresh token that can get us a new one
   */
  isAuthenticated(): boolean {
    // If we have a valid access token, we're authenticated
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return true;
    }
    
    // If access token is expired but we have a refresh token, we can still get a new token
    if (this.refreshToken) {
      return true;
    }
    
    // No valid tokens at all
    return false;
  }

  /**
   * Clear all OAuth2 tokens (logout)
   */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.idToken = null;
    this.userInfo = null;
    this.logger.log('OAuth2 tokens cleared');
  }

  /**
   * Get BOG user info from ID token
   * Note: BOG Business Online doesn't provide user profile data (name, email, etc.)
   * Only company ID and user ID are available from the token
   */
  getUserInfo(): any {
    if (!this.idToken) {
      this.logger.debug('No ID token available for user info');
      return null;
    }

    try {
      // Decode JWT to get company info and user ID
      const parts = this.idToken.split('.');
      if (parts.length !== 3) {
        this.logger.warn('Invalid ID token format');
        return null;
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );

      // BOG doesn't provide user profile data, only company and user identifiers
      return {
        name: 'BOG Business User',
        companyId: payload.company_client_id_cbs || 'N/A',
        userId: payload.sub,
      };
    } catch (error) {
      this.logger.error('Failed to get user info', error);
      return null;
    }
  }

  /**
   * Get OAuth2 access token from BOG
   * Tries OAuth2 token first, falls back to client credentials
   * @param useWithdrawalCredentials - If true, uses withdrawal client credentials instead of regular ones
   */
  private async getAccessToken(useWithdrawalCredentials = false): Promise<string> {
    // Check if we have a valid OAuth2 token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      this.logger.debug('Using cached OAuth2 access token');
      return this.accessToken;
    }

    // Try to refresh if we have a refresh token
    if (this.refreshToken) {
      this.logger.debug('Access token expired, attempting refresh');
      try {
        return await this.refreshAccessToken();
      } catch (error) {
        this.logger.warn('Refresh failed, falling back to client credentials');
      }
    }

    // Fall back to client credentials flow
    try {
      const clientId = useWithdrawalCredentials && this.withdrawalClientId ? this.withdrawalClientId : this.clientId;
      const clientSecret = useWithdrawalCredentials && this.withdrawalClientSecret ? this.withdrawalClientSecret : this.clientSecret;
      
      const authEndpoint = 'https://account.bog.ge/auth/realms/bog/protocol/openid-connect/token';
      this.logger.debug(`Requesting client credentials token from: ${authEndpoint}${useWithdrawalCredentials ? ' (withdrawal account)' : ''}`);
      this.logger.debug(`Client ID: ${clientId}`);
      
      // Create Basic Auth header
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await axios.post(
        authEndpoint,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
          },
        },
      );

      this.logger.debug(`OAuth2 Response status: ${response.status}`);

      this.accessToken = response.data.access_token;
      // Set token expiry (usually expires_in is in seconds)
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      this.logger.log('Successfully obtained BOG access token via client credentials');
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get BOG access token');
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        this.logger.error(`Error: ${error.message}`);
      }
      throw new BadRequestException('Failed to authenticate with BOG API');
    }
  }

  /**
   * Transfer money to seller's bank account
   */
  async transferToSeller(
    transferRequest: BogTransferRequest,
  ): Promise<BogTransferResponse> {
    // Use withdrawal credentials for actual money transfers
    const token = await this.getAccessToken(true);

    // Validate IBAN format (basic check)
    if (!transferRequest.beneficiaryAccountNumber.startsWith('GE')) {
      throw new BadRequestException('Invalid IBAN format. Must start with GE');
    }

    // Validate amount
    if (transferRequest.amount <= 0) {
      throw new BadRequestException('Transfer amount must be greater than 0');
    }

    // Check if transfer is within bulk limit (10,000 GEL)
    const dispatchType = transferRequest.amount <= 10000 ? 'BULK' : 'MT103';

    const documentData = {
      Nomination: transferRequest.nomination,
      ValueDate: new Date().toISOString(),
      UniqueId: uuidv4(), // Generate unique transaction ID
      Amount: transferRequest.amount,
      DocumentNo: `SA-${Date.now()}`, // SoulArt transaction number
      SourceAccountNumber: this.companyIban,
      BeneficiaryAccountNumber: transferRequest.beneficiaryAccountNumber,
      BeneficiaryBankCode: transferRequest.beneficiaryBankCode || 'BAGAGE22', // Default to BOG
      BeneficiaryInn: transferRequest.beneficiaryInn,
      BeneficiaryName: transferRequest.beneficiaryName,
      DispatchType: dispatchType,
    };

    try {
      this.logger.log(
        `Initiating transfer of ${transferRequest.amount} GEL to ${transferRequest.beneficiaryAccountNumber}`,
      );
      this.logger.debug(`Transfer document data: ${JSON.stringify(documentData, null, 2)}`);

      const response = await axios.post(
        `${this.apiUrl}/documents/domestic`,
        [documentData], // API expects an array
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.debug(`BOG API Response: ${JSON.stringify(response.data, null, 2)}`);

      const result = response.data[0]; // Get first result from array

      // Check if result exists
      if (!result) {
        this.logger.error('BOG API returned empty result array');
        throw new BadRequestException(
          'Bank API returned invalid response. Please contact support.',
        );
      }

      // Check result code (1 = success, 0 = ready to sign)
      if (result.ResultCode !== 1 && result.ResultCode !== 0) {
        this.logger.error(
          `BOG transfer failed with result code: ${result.ResultCode}, Message: ${result.Message || 'No message'}`,
        );
        
        // Map common error codes to user-friendly messages
        let errorMessage = result.Message;
        switch (result.ResultCode) {
          case 29:
            errorMessage = 'ანგარიშის ნომერი და პირადი ნომერი არ ემთხვევა. გთხოვთ შეამოწმოთ პროფილში მითითებული ანგარიშის ნომერი და პირადი ნომერი.';
            break;
          case 28:
            errorMessage = 'გადარიცხვა შესაძლებელია მხოლოდ საქართველოს ბანკის ანგარიშზე CheckInn პარამეტრით.';
            break;
          case 39:
          case 44:
          case 87:
            errorMessage = 'მიმღების ანგარიშის ნომერი არასწორია. გთხოვთ შეამოწმოთ IBAN.';
            break;
          case 41:
            errorMessage = 'მიმღების პირადი ნომერი არასწორია.';
            break;
          case 333:
          case 444:
            errorMessage = 'არასაკმარისი თანხა ანგარიშზე გადასარიცხად.';
            break;
          case 674:
            errorMessage = 'თქვენ არ გაქვთ უფლება ამ ანგარიშზე გადარიცხვის.';
            break;
          default:
            errorMessage = errorMessage || `გადარიცხვა ვერ მოხერხდა. შეცდომის კოდი: ${result.ResultCode}`;
        }
        
        throw new BadRequestException(errorMessage);
      }

      this.logger.log(
        `Transfer successful. UniqueKey: ${result.UniqueKey}, Match: ${result.Match}%`,
      );

      return {
        uniqueId: result.UniqueId,
        uniqueKey: result.UniqueKey,
        resultCode: result.ResultCode,
        match: result.Match,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error('BOG transfer failed', error.response?.data || error.message);
      
      // Log full error details for debugging
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      
      throw new BadRequestException(
        error.response?.data?.message ||
          error.message ||
          'Failed to process bank transfer. Please try again.',
      );
    }
  }

  /**
   * Transfer to multiple sellers in batch
   */
  async batchTransferToSellers(
    transfers: BogTransferRequest[],
  ): Promise<BogTransferResponse[]> {
    // Use withdrawal credentials for actual money transfers
    const token = await this.getAccessToken(true);

    const documents = transfers.map((transfer) => ({
      Nomination: transfer.nomination,
      ValueDate: new Date().toISOString(),
      UniqueId: uuidv4(),
      Amount: transfer.amount,
      DocumentNo: `SA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      SourceAccountNumber: this.companyIban,
      BeneficiaryAccountNumber: transfer.beneficiaryAccountNumber,
      BeneficiaryBankCode: transfer.beneficiaryBankCode || 'BAGAGE22',
      BeneficiaryInn: transfer.beneficiaryInn,
      BeneficiaryName: transfer.beneficiaryName,
      CheckInn: true,
      DispatchType: transfer.amount <= 10000 ? 'BULK' : 'MT103',
    }));

    try {
      this.logger.log(`Initiating batch transfer for ${transfers.length} sellers`);

      const response = await axios.post(
        `${this.apiUrl}/documents/domestic`,
        documents,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.map((result: any) => ({
        uniqueId: result.UniqueId,
        uniqueKey: result.UniqueKey,
        resultCode: result.ResultCode,
        match: result.Match,
      }));
    } catch (error) {
      this.logger.error('Batch transfer failed', error.response?.data || error);
      throw new BadRequestException('Failed to process batch transfer');
    }
  }

  /**
   * Sign a document in BOG system with OTP
   * API: POST /api/sign/document
   */
  async signDocument(uniqueKey: number, otp: string): Promise<boolean> {
    const token = await this.getAccessToken();

    try {
      this.logger.log(`Signing document with UniqueKey: ${uniqueKey}`);
      this.logger.debug(`OTP length: ${otp.length}, OTP value: ${otp}`);

      // First, check document status to ensure it can be signed
      const status = await this.getDocumentStatus(uniqueKey);
      this.logger.debug(`Document status before signing: ${JSON.stringify(status)}`);
      
      if (status.Status !== 'A') {
        throw new BadRequestException(
          `Document cannot be signed. Current status: ${status.Status} (${this.getStatusText(status.Status)})`
        );
      }

      const requestBody = {
        Otp: otp,
        ObjectKey: uniqueKey,
      };
      
      this.logger.debug(`Sign request body: ${JSON.stringify(requestBody)}`);
      this.logger.debug(`Endpoint: ${this.apiUrl}/sign/document`);

      const response = await axios.post(
        `${this.apiUrl}/sign/document`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Document signed successfully: ${uniqueKey}`);
      this.logger.debug(`Sign response: ${JSON.stringify(response.data)}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to sign document ${uniqueKey}`,
      );
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
        
        // Get BOG error message
        const bogMessage = error.response.data?.Message || error.response.data?.message;
        
        // Map common BOG errors to Georgian
        let errorMessage = bogMessage;
        if (bogMessage) {
          if (bogMessage.includes('does not have sign permission')) {
            errorMessage = 'API მომხმარებელს არ აქვს დოკუმენტის ხელმოწერის უფლება. გთხოვთ დაუკავშირდეთ BOG-ს და მიანიჭოთ Sign permission API User-ს.';
          } else if (bogMessage.includes('Invalid OTP') || bogMessage.includes('OTP')) {
            errorMessage = 'არასწორი ან ვადაგასული OTP კოდი. გთხოვთ მოითხოვოთ ახალი OTP.';
          } else if (bogMessage.includes('Document not found')) {
            errorMessage = 'დოკუმენტი ვერ მოიძებნა BOG სისტემაში.';
          } else {
            errorMessage = `BOG შეცდომა: ${bogMessage}`;
          }
        }
        
        throw new BadRequestException(errorMessage || 'დოკუმენტის ხელმოწერა ვერ მოხერხდა');
      } else if (error.request) {
        this.logger.error(`No response received. Request: ${JSON.stringify(error.request)}`);
        throw new BadRequestException('BOG სერვერთან კავშირი ვერ დამყარდა');
      } else {
        this.logger.error(`Error message: ${error.message}`);
        throw new BadRequestException(error.message || 'დოკუმენტის ხელმოწერა ვერ მოხერხდა');
      }
    }
  }

  /**
   * Request OTP for document signing
   * API: POST /api/otp/request
   * Note: BOG requires ObjectKey (document ID) and ObjectType (0 for Payment)
   */
  async requestOtp(uniqueKey?: number): Promise<void> {
    const token = await this.getAccessToken();

    try {
      // BOG API requires ObjectKey and ObjectType
      // ObjectType: 0 = Payment
      const requestBody = {
        ObjectKey: uniqueKey || 0,
        ObjectType: 0,
      };
      
      this.logger.log(`Requesting OTP for ObjectKey: ${requestBody.ObjectKey}`);
      this.logger.debug(`OTP request body: ${JSON.stringify(requestBody)}`);

      await axios.post(
        `${this.apiUrl}/otp/request`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log('OTP requested successfully');
    } catch (error) {
      this.logger.error('Failed to request OTP', error.response?.data || error.message);
      throw new BadRequestException('Failed to request OTP');
    }
  }

  /**
   * Get account balance for company IBAN
   * API: GET /api/accounts/{accountNumber}/{currency}
   */
  async getAccountBalance(): Promise<{
    accountNumber: string;
    availableBalance: number;
    currentBalance: number;
    currency: string;
  }> {
    const token = await this.getAccessToken();

    try {
      this.logger.log(`Fetching balance for account: ${this.companyIban}`);

      const response = await axios.get(
        `${this.apiUrl}/accounts/${this.companyIban}/GEL`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Account balance retrieved successfully`);

      return {
        accountNumber: this.companyIban,
        availableBalance: response.data.AvailableBalance,
        currentBalance: response.data.CurrentBalance,
        currency: 'GEL',
      };
    } catch (error) {
      this.logger.error('Failed to get account balance', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch account balance');
    }
  }

  /**
   * Note: BOG API doesn't provide an endpoint to list ALL pending documents
   * We track pending withdrawals in our database instead
   * Use getDocumentStatus(uniqueKey) to check individual document status by UniqueKey
   */

  /**
   * Get document status by UniqueKey
   * API: GET /api/documents/statuses/{keys}
   */
  async getDocumentStatus(uniqueKey: number): Promise<any> {
    const token = await this.getAccessToken();

    try {
      this.logger.log(`Fetching status for document: ${uniqueKey}`);

      const response = await axios.get(
        `${this.apiUrl}/documents/statuses/${uniqueKey}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // API returns an array, get first item
      const status = Array.isArray(response.data) ? response.data[0] : response.data;
      return status;
    } catch (error) {
      this.logger.error(
        `Failed to get document status for ${uniqueKey}`,
        error.response?.data || error.message,
      );
      throw new BadRequestException('Failed to fetch document status');
    }
  }

  /**
   * Get multiple document statuses by UniqueKeys
   * API: GET /api/documents/statuses/{keys}
   * Keys can be comma-separated: /api/documents/statuses/123,456,789
   */
  async getDocumentStatuses(uniqueKeys: number[]): Promise<any[]> {
    if (!uniqueKeys || uniqueKeys.length === 0) {
      return [];
    }

    const token = await this.getAccessToken();

    try {
      const keysString = uniqueKeys.join(',');
      this.logger.log(`Fetching statuses for documents: ${keysString}`);

      const response = await axios.get(
        `${this.apiUrl}/documents/statuses/${keysString}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return Array.isArray(response.data) ? response.data : [response.data];
    } catch (error) {
      this.logger.error(
        `Failed to get document statuses for ${uniqueKeys.join(',')}`,
        error.response?.data || error.message,
      );
      // Don't throw error, return empty array to not break the flow
      return [];
    }
  }

  /**
   * Get human-readable status text
   */
  getStatusText(statusCode: string): string {
    return BOG_STATUS_MAP[statusCode] || statusCode;
  }
}
