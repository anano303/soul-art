import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import {
  EtsyAuth,
  EtsyAuthDocument,
  ETSY_AUTH_KEY,
} from './schemas/etsy-auth.schema';

const ETSY_OAUTH_CONNECT_URL = 'https://www.etsy.com/oauth/connect';
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';
const ETSY_API_BASE_URL = 'https://api.etsy.com/v3';

// Scopes needed to create/manage listings in the connected shop
const ETSY_SCOPES = ['listings_r', 'listings_w', 'listings_d', 'shops_r'];

// Refresh the access token this many ms before it actually expires
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

// How long a started OAuth handshake stays valid
const PENDING_OAUTH_TTL_MS = 15 * 60 * 1000;

export interface EtsyConnectionStatus {
  configured: boolean;
  connected: boolean;
  shopId?: string;
  shopName?: string;
  etsyUserId?: string;
  scopes?: string[];
  tokenExpiresAt?: Date;
}

@Injectable()
export class EtsyService {
  private readonly logger = new Logger(EtsyService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(EtsyAuth.name)
    private readonly etsyAuthModel: Model<EtsyAuthDocument>,
  ) {}

  // ============================================
  // Configuration
  // ============================================

  private get keystring(): string | undefined {
    return this.configService.get<string>('ETSY_KEYSTRING');
  }

  private get sharedSecret(): string | undefined {
    return this.configService.get<string>('ETSY_SHARED_SECRET');
  }

  /**
   * Etsy requires "keystring:shared_secret" in the x-api-key header
   * (returns 403 "Shared secret is required in x-api-key header" otherwise).
   * OAuth token requests still use the bare keystring as client_id.
   */
  private get apiKeyHeader(): string {
    return this.sharedSecret
      ? `${this.keystring}:${this.sharedSecret}`
      : this.keystring;
  }

  private get redirectUri(): string | undefined {
    return this.configService.get<string>('ETSY_REDIRECT_URI');
  }

  isConfigured(): boolean {
    return Boolean(this.keystring && this.sharedSecret && this.redirectUri);
  }

  private ensureConfigured() {
    if (!this.isConfigured()) {
      throw new HttpException(
        'Etsy API is not configured. Set ETSY_KEYSTRING, ETSY_SHARED_SECRET and ETSY_REDIRECT_URI in .env',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // Connection status
  // ============================================

  private async getAuthDoc(): Promise<EtsyAuthDocument | null> {
    return this.etsyAuthModel.findOne({ key: ETSY_AUTH_KEY }).exec();
  }

  async getConnectionStatus(): Promise<EtsyConnectionStatus> {
    let doc = await this.getAuthDoc();

    // Self-heal: the account may have had no shop at OAuth time (shop created
    // later on etsy.com) — retry resolution whenever status is checked.
    if (doc?.refreshToken && !doc.shopId) {
      try {
        await this.resolveShop(doc);
        doc = await this.getAuthDoc();
      } catch (error) {
        this.logger.warn(`Etsy shop re-resolution failed: ${error.message}`);
      }
    }

    return {
      configured: this.isConfigured(),
      connected: Boolean(doc?.refreshToken),
      shopId: doc?.shopId,
      shopName: doc?.shopName,
      etsyUserId: doc?.etsyUserId,
      scopes: doc?.scopes,
      tokenExpiresAt: doc?.tokenExpiresAt,
    };
  }

  async disconnect(): Promise<void> {
    await this.etsyAuthModel.updateOne(
      { key: ETSY_AUTH_KEY },
      {
        $unset: {
          accessToken: 1,
          refreshToken: 1,
          tokenExpiresAt: 1,
          etsyUserId: 1,
          shopId: 1,
          shopName: 1,
          pendingState: 1,
          pendingCodeVerifier: 1,
          pendingExpiresAt: 1,
        },
        $set: { scopes: [] },
      },
    );
    this.logger.log('Etsy connection removed');
  }

  // ============================================
  // OAuth 2.0 (Authorization Code + PKCE)
  // Etsy v3 uses PKCE — the shared secret is NOT part of this flow,
  // only the keystring (as client_id / x-api-key).
  // ============================================

  async generateAuthUrl(): Promise<string> {
    this.ensureConfigured();

    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Persist the handshake in DB so the callback can complete it
    // even on a different serverless instance
    await this.etsyAuthModel.updateOne(
      { key: ETSY_AUTH_KEY },
      {
        $set: {
          pendingState: state,
          pendingCodeVerifier: codeVerifier,
          pendingExpiresAt: new Date(Date.now() + PENDING_OAUTH_TTL_MS),
        },
      },
      { upsert: true },
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.keystring,
      redirect_uri: this.redirectUri,
      scope: ETSY_SCOPES.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${ETSY_OAUTH_CONNECT_URL}?${params.toString()}`;
  }

  async handleOAuthCallback(code: string, state: string): Promise<EtsyConnectionStatus> {
    this.ensureConfigured();

    const doc = await this.getAuthDoc();
    if (!doc?.pendingState || !doc?.pendingCodeVerifier) {
      throw new HttpException(
        'No pending Etsy authorization. Start again from /etsy/auth',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (doc.pendingExpiresAt && doc.pendingExpiresAt.getTime() < Date.now()) {
      throw new HttpException(
        'Etsy authorization expired. Start again from /etsy/auth',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (doc.pendingState !== state) {
      throw new HttpException('Invalid OAuth state', HttpStatus.BAD_REQUEST);
    }

    const tokens = await this.requestTokens({
      grant_type: 'authorization_code',
      client_id: this.keystring,
      redirect_uri: this.redirectUri,
      code,
      code_verifier: doc.pendingCodeVerifier,
    });

    // Etsy access tokens are "{user_id}.{token}"
    const etsyUserId = tokens.access_token.split('.')[0];

    doc.accessToken = tokens.access_token;
    doc.refreshToken = tokens.refresh_token;
    doc.tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    doc.etsyUserId = etsyUserId;
    doc.scopes = ETSY_SCOPES;
    doc.pendingState = undefined;
    doc.pendingCodeVerifier = undefined;
    doc.pendingExpiresAt = undefined;
    await doc.save();

    this.logger.log(`Etsy account connected (user ${etsyUserId})`);

    // Resolve the shop attached to this Etsy account
    try {
      await this.resolveShop(doc);
    } catch (error) {
      this.logger.warn(`Could not resolve Etsy shop info: ${error.message}`);
    }

    return this.getConnectionStatus();
  }

  private async resolveShop(doc: EtsyAuthDocument): Promise<void> {
    const me = await this.apiRequest<{ user_id: number; shop_id: number }>(
      'GET',
      '/application/users/me',
    );
    if (me?.shop_id) {
      const shop = await this.apiRequest<{ shop_id: number; shop_name: string }>(
        'GET',
        `/application/shops/${me.shop_id}`,
      );
      doc.shopId = String(me.shop_id);
      doc.shopName = shop?.shop_name;
      await doc.save();
      this.logger.log(`Etsy shop resolved: ${shop?.shop_name} (${me.shop_id})`);
    } else {
      this.logger.warn(
        'Connected Etsy account has no shop yet — create a shop on Etsy first',
      );
    }
  }

  /**
   * The connected shop's ID, required by all listing endpoints.
   */
  async getShopId(): Promise<string> {
    const doc = await this.getAuthDoc();
    if (!doc?.shopId) {
      throw new HttpException(
        'No Etsy shop connected. Connect the shop via /etsy/auth first (the Etsy account must have a shop)',
        HttpStatus.PRECONDITION_FAILED,
      );
    }
    return doc.shopId;
  }

  private async requestTokens(body: Record<string, string>): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch(ETSY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error_description || data?.error || response.statusText;
      this.logger.error(`Etsy token request failed: ${message}`);
      throw new HttpException(
        `Etsy token request failed: ${message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    return data;
  }

  /**
   * Returns a valid access token, refreshing it when it is about to expire.
   * Etsy rotates refresh tokens on every refresh — the new one is persisted.
   */
  async getAccessToken(): Promise<string> {
    this.ensureConfigured();

    const doc = await this.getAuthDoc();
    if (!doc?.refreshToken) {
      throw new HttpException(
        'Etsy shop is not connected. Authorize via /etsy/auth first',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const isValid =
      doc.accessToken &&
      doc.tokenExpiresAt &&
      doc.tokenExpiresAt.getTime() - Date.now() > TOKEN_REFRESH_MARGIN_MS;
    if (isValid) {
      return doc.accessToken;
    }

    return this.refreshAccessToken(doc);
  }

  private async refreshAccessToken(doc: EtsyAuthDocument): Promise<string> {
    const tokens = await this.requestTokens({
      grant_type: 'refresh_token',
      client_id: this.keystring,
      refresh_token: doc.refreshToken,
    });

    doc.accessToken = tokens.access_token;
    doc.refreshToken = tokens.refresh_token; // rotated by Etsy
    doc.tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await doc.save();

    this.logger.log('Etsy access token refreshed');
    return doc.accessToken;
  }

  /**
   * Manual token refresh (admin "refresh" button), regardless of expiry.
   */
  async forceRefreshToken(): Promise<EtsyConnectionStatus> {
    this.ensureConfigured();

    const doc = await this.getAuthDoc();
    if (!doc?.refreshToken) {
      throw new HttpException(
        'Etsy shop is not connected. Authorize via /etsy/auth first',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    await this.refreshAccessToken(doc);
    return this.getConnectionStatus();
  }

  // ============================================
  // Marketplace settings
  // ============================================

  async getSettings(): Promise<{
    listingFeeGel: number;
    commissionPercent: number;
    integrationEnabled: boolean;
    enabledForAdmins: boolean;
    temporarilyDisabled: boolean;
  }> {
    const doc = await this.getAuthDoc();
    return {
      listingFeeGel: doc?.listingFeeGel ?? 2,
      commissionPercent: doc?.commissionPercent ?? 20,
      integrationEnabled: doc?.integrationEnabled ?? false,
      enabledForAdmins: doc?.enabledForAdmins ?? true,
      temporarilyDisabled: doc?.temporarilyDisabled ?? false,
    };
  }

  async updateSettings(update: {
    listingFeeGel?: number;
    commissionPercent?: number;
    integrationEnabled?: boolean;
    enabledForAdmins?: boolean;
    temporarilyDisabled?: boolean;
  }) {
    const $set: Record<string, any> = {};
    if (update.listingFeeGel !== undefined) $set.listingFeeGel = update.listingFeeGel;
    if (update.commissionPercent !== undefined) $set.commissionPercent = update.commissionPercent;
    if (update.integrationEnabled !== undefined) $set.integrationEnabled = update.integrationEnabled;
    if (update.enabledForAdmins !== undefined) $set.enabledForAdmins = update.enabledForAdmins;
    if (update.temporarilyDisabled !== undefined) $set.temporarilyDisabled = update.temporarilyDisabled;

    if (Object.keys($set).length > 0) {
      await this.etsyAuthModel.updateOne(
        { key: ETSY_AUTH_KEY },
        { $set },
        { upsert: true },
      );
    }
    return this.getSettings();
  }

  /**
   * Etsy refresh tokens die after 90 days without use. A weekly refresh
   * keeps the rotation chain alive even when nothing is posted, so the
   * one-time admin authorization never has to be repeated.
   */
  @Cron(CronExpression.EVERY_WEEK, { timeZone: 'Asia/Tbilisi' })
  async keepTokenAlive() {
    const doc = await this.getAuthDoc();
    if (!doc?.refreshToken) return;
    try {
      await this.getAccessToken();
      this.logger.log('Etsy token keep-alive refresh completed');
    } catch (error) {
      this.logger.error(`Etsy token keep-alive failed: ${error.message}`);
    }
  }

  // ============================================
  // API helpers
  // ============================================

  /**
   * Authenticated request to the Etsy v3 API.
   * Used by upcoming listing-creation methods.
   */
  async apiRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, any> | FormData,
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

    const response = await fetch(`${ETSY_API_BASE_URL}${path}`, {
      method,
      headers: {
        'x-api-key': this.apiKeyHeader,
        Authorization: `Bearer ${accessToken}`,
        // FormData sets its own multipart Content-Type with boundary
        ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      },
      body: isForm ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error || response.statusText;
      this.logger.error(`Etsy API ${method} ${path} failed: ${message}`);
      throw new HttpException(
        `Etsy API error: ${message}`,
        response.status === 429
          ? HttpStatus.TOO_MANY_REQUESTS
          : HttpStatus.BAD_GATEWAY,
      );
    }
    return data as T;
  }

  /**
   * Verifies the keystring against Etsy (no OAuth needed).
   * Use this right after adding the env variables.
   */
  async ping(): Promise<{ ok: boolean; applicationId?: number }> {
    this.ensureConfigured();

    const response = await fetch(`${ETSY_API_BASE_URL}/application/openapi-ping`, {
      headers: { 'x-api-key': this.apiKeyHeader },
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      this.logger.error(`Etsy ping failed: ${response.status}`);
      return { ok: false };
    }
    return { ok: true, applicationId: data?.application_id };
  }

  /**
   * Info about the connected shop (requires completed OAuth).
   */
  async getShop(): Promise<any> {
    const doc = await this.getAuthDoc();
    if (!doc?.shopId) {
      throw new HttpException(
        'No Etsy shop connected',
        HttpStatus.PRECONDITION_FAILED,
      );
    }
    return this.apiRequest('GET', `/application/shops/${doc.shopId}`);
  }
}
