import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { ProductDocument } from '../schemas/product.schema';

export interface TikTokPostResult {
  success: boolean;
  publishId?: string;
  error?: any;
}

/**
 * TikTok Content Posting Service
 *
 * Uses TikTok's Photo Mode API which:
 * - Uploads photos directly (no video conversion needed)
 * - User can add TikTok's music library songs in the app
 * - No server-side video processing = no server load
 *
 * Prerequisites:
 * 1. Create TikTok Developer Account: https://developers.tiktok.com/
 * 2. Create an app and get Client Key & Client Secret
 * 3. Request "Direct Post" API access (requires app review)
 * 4. Implement OAuth flow to get user access token with:
 *    - video.publish
 *    - video.upload
 * 5. Set environment variables:
 *    - TIKTOK_CLIENT_KEY
 *    - TIKTOK_CLIENT_SECRET
 *    - TIKTOK_ACCESS_TOKEN (from OAuth flow)
 *    - TIKTOK_AUTO_POST=true
 */
@Injectable()
export class TikTokPostingService {
  private readonly logger = new Logger(TikTokPostingService.name);

  private readonly clientKey = process.env.TIKTOK_CLIENT_KEY || '';
  private readonly clientSecret = process.env.TIKTOK_CLIENT_SECRET || '';
  private currentAccessToken = process.env.TIKTOK_ACCESS_TOKEN || '';
  private currentRefreshToken = process.env.TIKTOK_REFRESH_TOKEN || '';
  private readonly autoPost =
    (process.env.TIKTOK_AUTO_POST || 'false').toLowerCase() === 'true';

  private readonly allowedOrigins = process.env.ALLOWED_ORIGINS || '';
  private readonly serverBaseUrl = process.env.SERVER_BASE_URL || '';

  /**
   * Auto-refresh TikTok token every 12 hours
   * TikTok access tokens expire after 24 hours
   */
  @Cron('0 */12 * * *')
  async handleTokenRefresh() {
    if (!this.isEnabled() || !this.currentRefreshToken) return;

    this.logger.log('Auto-refreshing TikTok access token...');
    const result = await this.refreshAccessToken(this.currentRefreshToken);

    if (result.accessToken) {
      this.currentAccessToken = result.accessToken;
      if (result.refreshToken) {
        this.currentRefreshToken = result.refreshToken;
      }
      this.logger.log('TikTok access token refreshed successfully');
    } else {
      this.logger.error('Failed to refresh TikTok token:', result.error);
    }
  }

  /**
   * Get current access token (may be auto-refreshed)
   */
  getAccessToken(): string {
    return this.currentAccessToken;
  }

  /**
   * Check if TikTok posting is enabled
   */
  isEnabled(): boolean {
    return Boolean(this.clientKey && this.currentAccessToken && this.autoPost);
  }

  /**
   * Get the public base URL for product links
   */
  private getPublicBaseUrl(): string {
    const firstOrigin = this.allowedOrigins
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)[0];

    const base = (firstOrigin || this.serverBaseUrl || '').replace(/\/$/, '');
    return base;
  }

  /**
   * Build product URL
   */
  private buildProductUrl(product: ProductDocument): string {
    const base = this.getPublicBaseUrl();
    const slugOrId = (product as any).slug || product._id;
    return `${base}/products/${slugOrId}`;
  }

  /**
   * Format price with discount info
   */
  private formatPrice(product: ProductDocument): string {
    const currency = '₾';
    const now = new Date();
    const hasDiscount = (product.discountPercentage || 0) > 0;
    const startOk =
      !product.discountStartDate || new Date(product.discountStartDate) <= now;
    const endOk =
      !product.discountEndDate || new Date(product.discountEndDate) >= now;
    const activeDiscount = hasDiscount && startOk && endOk;

    if (activeDiscount) {
      const discountPct = product.discountPercentage || 0;
      const discountAmount = (product.price * discountPct) / 100;
      const finalPrice = Math.max(
        0,
        Math.round((product.price - discountAmount) * 100) / 100,
      );
      return `${finalPrice}${currency} (${discountPct}% OFF!)`;
    }

    return `${product.price}${currency}`;
  }

  /**
   * Get hashtags for TikTok
   */
  private formatHashtags(product: ProductDocument): string {
    const tags: string[] = [];

    // Add product hashtags
    if (product.hashtags && product.hashtags.length > 0) {
      tags.push(...product.hashtags);
    }

    // Add default tags
    const defaultTags = [
      'soulart',
      'handmade',
      'art',
      'georgia',
      'საქართველო',
      'ხელნაკეთი',
    ];
    tags.push(...defaultTags);

    // TikTok has a limit on caption length, so limit hashtags
    const uniqueTags = [...new Set(tags)].slice(0, 10);
    return uniqueTags.map((t) => `#${t.replace(/^#/, '')}`).join(' ');
  }

  /**
   * Build caption for TikTok
   * TikTok captions are limited to 2200 characters
   */
  private buildCaption(product: ProductDocument): string {
    const title = product.name || product.nameEn || 'პროდუქტი';
    const price = this.formatPrice(product);
    const hashtags = this.formatHashtags(product);

    // Keep it short and engaging for TikTok
    const parts: string[] = [
      `✨ ${title}`,
      `💰 ${price}`,
      `🔗 Link in bio: soulart.ge`,
      '',
      hashtags,
    ];

    const caption = parts.join('\n');

    // TikTok caption limit is 2200 characters
    return caption.slice(0, 2200);
  }

  /**
   * Post photos to TikTok using Photo Mode API
   * Photos are uploaded directly - no video conversion needed!
   * User can add music from TikTok's library in the app
   *
   * @param imageUrls Array of image URLs (max 35 photos)
   * @param caption Caption for the post
   */
  async postPhotos(
    imageUrls: string[],
    caption: string,
  ): Promise<TikTokPostResult> {
    try {
      if (!this.isEnabled()) {
        this.logger.debug('TikTok posting disabled or not configured');
        return { success: false, error: 'TIKTOK_DISABLED' };
      }

      if (imageUrls.length === 0) {
        return { success: false, error: 'NO_IMAGES_PROVIDED' };
      }

      // TikTok Photo Mode supports up to 35 photos
      const photos = imageUrls.slice(0, 35);

      // Step 1: Verify creator info
      const creatorInfoRes = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
        {},
        {
          headers: {
            Authorization: `Bearer ${this.currentAccessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
        },
      );

      if (creatorInfoRes.data?.error?.code !== 'ok') {
        throw new Error(
          creatorInfoRes.data?.error?.message || 'Failed to get creator info',
        );
      }

      // Step 2: Post photos using Photo Mode (MEDIA_UPLOAD mode)
      // TikTok will create a slideshow, user can add music from TikTok's library
      const postRes = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/content/init/',
        {
          post_info: {
            title: caption.slice(0, 150), // TikTok title limit
            description: caption,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            photo_images: photos,
            photo_cover_index: 0, // First photo as cover
          },
          // Required parameters for photo upload
          post_mode: 'MEDIA_UPLOAD',
          media_type: 'PHOTO',
        },
        {
          headers: {
            Authorization: `Bearer ${this.currentAccessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
        },
      );

      if (postRes.data?.error?.code && postRes.data?.error?.code !== 'ok') {
        throw new Error(
          postRes.data?.error?.message || 'Failed to post photos',
        );
      }

      const publishId = postRes.data?.data?.publish_id;

      this.logger.log(
        `TikTok photo post initiated: ${publishId} with ${photos.length} photos`,
      );

      return { success: true, publishId };
    } catch (error: any) {
      const errPayload = error?.response?.data || { message: error.message };
      this.logger.error('TikTok photo post failed', errPayload);
      return { success: false, error: errPayload };
    }
  }

  /**
   * Post a video to TikTok (from URL)
   */
  async postVideo(
    videoUrl: string,
    caption: string,
  ): Promise<TikTokPostResult> {
    try {
      if (!this.isEnabled()) {
        this.logger.debug('TikTok posting disabled or not configured');
        return { success: false, error: 'TIKTOK_DISABLED' };
      }

      // Step 1: Get creator info
      const creatorInfoRes = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
        {},
        {
          headers: {
            Authorization: `Bearer ${this.currentAccessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
        },
      );

      if (creatorInfoRes.data?.error?.code !== 'ok') {
        throw new Error(
          creatorInfoRes.data?.error?.message || 'Failed to get creator info',
        );
      }

      // Step 2: Initialize video upload
      const initRes = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/video/init/',
        {
          post_info: {
            title: caption.slice(0, 150),
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: videoUrl,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.currentAccessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
        },
      );

      if (initRes.data?.error?.code !== 'ok') {
        throw new Error(
          initRes.data?.error?.message || 'Failed to initialize video upload',
        );
      }

      const publishId = initRes.data?.data?.publish_id;

      this.logger.log(`TikTok video upload initiated: ${publishId}`);

      return { success: true, publishId };
    } catch (error: any) {
      const errPayload = error?.response?.data || { message: error.message };
      this.logger.error('TikTok video post failed', errPayload);
      return { success: false, error: errPayload };
    }
  }

  /**
   * Post a product to TikTok
   * - If product has video: uploads video
   * - If product has images: uses Photo Mode (no video conversion!)
   *
   * User can add TikTok music from the app after posting
   */
  async postProduct(product: ProductDocument): Promise<TikTokPostResult> {
    try {
      if (!this.isEnabled()) {
        this.logger.debug('TikTok posting disabled or not configured');
        return { success: false, error: 'TIKTOK_DISABLED' };
      }

      const caption = this.buildCaption(product);

      // Check if product has a video
      const existingVideoUrl =
        (product as any).youtubeVideoUrl ||
        (product as any).videoUrl ||
        (product as any).tiktokVideoUrl;

      if (existingVideoUrl) {
        // Use existing video
        this.logger.log(`Posting video for product ${product._id}`);
        return await this.postVideo(existingVideoUrl, caption);
      }

      // No video - use Photo Mode with images
      const images = Array.isArray(product.images)
        ? product.images.filter(Boolean)
        : [];

      if (images.length === 0) {
        this.logger.debug(
          `Product ${product._id} has no images, skipping TikTok post`,
        );
        return { success: false, error: 'NO_MEDIA_AVAILABLE' };
      }

      // Post photos directly - TikTok handles everything!
      // User can add music from TikTok's library in the app
      this.logger.log(
        `Posting ${images.length} photos for product ${product._id} using Photo Mode`,
      );
      return await this.postPhotos(images, caption);
    } catch (error: any) {
      this.logger.error('TikTok product post failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check publish status
   */
  async checkPublishStatus(publishId: string): Promise<{
    status: string;
    error?: any;
  }> {
    try {
      const res = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
        {
          publish_id: publishId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.currentAccessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
        },
      );

      return {
        status: res.data?.data?.status || 'UNKNOWN',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        error: error?.response?.data || error.message,
      };
    }
  }

  /**
   * Refresh access token (TikTok tokens expire after 24 hours)
   * Call this periodically to keep the token fresh
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    error?: any;
  }> {
    try {
      const res = await axios.post(
        'https://open.tiktokapis.com/v2/oauth/token/',
        new URLSearchParams({
          client_key: this.clientKey,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return {
        accessToken: res.data?.access_token,
        refreshToken: res.data?.refresh_token,
        expiresIn: res.data?.expires_in,
      };
    } catch (error: any) {
      return {
        error: error?.response?.data || error.message,
      };
    }
  }
}
