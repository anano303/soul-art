import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { ProductDocument } from '../schemas/product.schema';

export interface TikTokPostResult {
  success: boolean;
  publishId?: string;
  error?: any;
}

export interface TikTokCreatorInfo {
  creator_avatar_url: string;
  creator_username: string;
  creator_nickname: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
}

export interface TikTokPostOptions {
  privacy_level: string;
  disable_comment: boolean;
  disable_duet: boolean;
  disable_stitch: boolean;
  brand_content_toggle: boolean;
  brand_organic_toggle: boolean;
  is_branded_content?: boolean;
  title?: string;
  description?: string;
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
   * Query TikTok Creator Info - required before posting
   * Returns creator's avatar, name, privacy options, interaction settings
   */
  async queryCreatorInfo(): Promise<{
    success: boolean;
    data?: TikTokCreatorInfo;
    error?: any;
  }> {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: 'TIKTOK_DISABLED' };
      }

      const res = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
        {},
        {
          headers: {
            Authorization: `Bearer ${this.currentAccessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
        },
      );

      if (res.data?.error?.code !== 'ok') {
        throw new Error(
          res.data?.error?.message || 'Failed to get creator info',
        );
      }

      return {
        success: true,
        data: res.data?.data as TikTokCreatorInfo,
      };
    } catch (error: any) {
      const errPayload = error?.response?.data || { message: error.message };
      this.logger.error('Failed to query creator info', errPayload);
      return { success: false, error: errPayload };
    }
  }

  /**
   * Get the public base URL for product links (frontend URL)
   */
  private getPublicBaseUrl(): string {
    // Always use the main frontend URL for product links
    return 'https://soulart.ge';
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
    const productUrl = this.buildProductUrl(product);

    // Artist/store name from product brand or user
    const artistName =
      (product as any).brand ||
      (product as any).user?.storeName ||
      (product as any).user?.name ||
      '';

    // Keep it short and engaging for TikTok
    const parts: string[] = [
      `✨ ${title}`,
      artistName ? `🎨 ${artistName}` : '',
      `💰 ${price}`,
      '',
      `🔗 ${productUrl}`,
      '',
      hashtags,
    ].filter(Boolean);

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
    options?: TikTokPostOptions,
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
      // Convert to proxy URLs so TikTok's URL ownership verification passes
      // TikTok requires images from a verified domain
      // MUST use api.soulart.ge (verified in TikTok Developer Portal)
      // NOT the DigitalOcean URL (seal-app-tilvb.ondigitalocean.app)
      const tiktokProxyBase = 'https://api.soulart.ge';
      const photos = imageUrls.slice(0, 35).map((url) => {
        // If already a verified proxy URL, use as-is
        if (url.startsWith(`${tiktokProxyBase}/v1/media/proxy/`)) {
          return url;
        }
        // ALL images must go through our verified proxy domain
        // TikTok only accepts URLs from the verified prefix: https://api.soulart.ge/v1/media/proxy/
        const encoded = Buffer.from(url).toString('base64url');
        return `${tiktokProxyBase}/v1/media/proxy/${encoded}`;
      });

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

      // Step 2: Post photos using Photo Mode
      // TikTok photo_images is list<string> of public URLs
      this.logger.log(
        `TikTok posting ${photos.length} photos. First URL: ${photos[0]?.substring(0, 100)}...`,
      );

      // Build post_info from user-selected options (required for TikTok audit)
      const postInfo: any = {
        title: (options?.title || caption).slice(0, 90),
        description: caption.slice(0, 4000),
        privacy_level: options?.privacy_level || 'SELF_ONLY',
        disable_comment: options?.disable_comment ?? false,
        auto_add_music: true,
      };

      // Commercial content disclosure (required for audit)
      if (options?.brand_content_toggle) {
        if (options.brand_organic_toggle) {
          postInfo.brand_content_toggle = true;
          postInfo.brand_organic_toggle = true;
        }
        if (options.is_branded_content) {
          postInfo.brand_content_toggle = true;
          postInfo.is_branded_content = true;
        }
      }

      const postRes = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/content/init/',
        {
          post_info: postInfo,
          source_info: {
            source: 'PULL_FROM_URL',
            photo_images: photos,
            photo_cover_index: 0,
          },
          post_mode: 'DIRECT_POST',
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
      this.logger.error(
        `TikTok photo post failed: ${JSON.stringify(errPayload)}`,
      );
      return { success: false, error: errPayload };
    }
  }

  /**
   * Post a video to TikTok (from URL)
   */
  async postVideo(
    videoUrl: string,
    caption: string,
    options?: TikTokPostOptions,
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

      // Log max video duration for compliance (TikTok validates server-side)
      const maxDuration =
        creatorInfoRes.data?.data?.max_video_post_duration_sec;
      if (maxDuration) {
        this.logger.log(
          `TikTok max video duration for creator: ${maxDuration}s`,
        );
      }

      // Step 2: Initialize video upload with user-selected options
      const initRes = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/video/init/',
        {
          post_info: {
            title: (options?.title || caption).slice(0, 2200),
            privacy_level: options?.privacy_level || 'SELF_ONLY',
            disable_duet: options?.disable_duet ?? false,
            disable_comment: options?.disable_comment ?? false,
            disable_stitch: options?.disable_stitch ?? false,
            ...(options?.brand_content_toggle
              ? {
                  brand_content_toggle: true,
                  brand_organic_toggle: !!options.brand_organic_toggle,
                  is_branded_content: !!options.is_branded_content,
                }
              : {}),
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
  async postProduct(
    product: ProductDocument,
    options?: TikTokPostOptions,
  ): Promise<TikTokPostResult> {
    try {
      if (!this.isEnabled()) {
        this.logger.debug('TikTok posting disabled or not configured');
        return { success: false, error: 'TIKTOK_DISABLED' };
      }

      // Use user-provided description if available, otherwise auto-generate
      const caption = options?.description || this.buildCaption(product);

      // Check if product has a DIRECT video file URL (not YouTube/webpage links)
      // YouTube URLs are webpage URLs, not direct video files - TikTok can't pull from them
      // Only use direct video file URLs (.mp4, .mov, .webm, etc.)
      const candidateVideoUrl =
        (product as any).tiktokVideoUrl || (product as any).videoUrl || '';

      const isDirectVideoUrl =
        candidateVideoUrl &&
        !candidateVideoUrl.includes('youtube.com') &&
        !candidateVideoUrl.includes('youtu.be') &&
        /\.(mp4|mov|webm|avi)(\?|$)/i.test(candidateVideoUrl);

      if (isDirectVideoUrl) {
        // Use direct video file
        this.logger.log(`Posting video for product ${product._id}`);
        return await this.postVideo(candidateVideoUrl, caption, options);
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
      return await this.postPhotos(images, caption, options);
    } catch (error: any) {
      this.logger.error('TikTok product post failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Debug: show what proxy URLs would be generated for a product
   */
  debugProxyUrls(product: ProductDocument): any {
    const images = Array.isArray(product.images)
      ? product.images.filter(Boolean)
      : [];

    const tiktokProxyBase = 'https://api.soulart.ge';
    const photos = images.slice(0, 35).map((url) => {
      if (url.startsWith(`${tiktokProxyBase}/v1/media/proxy/`)) {
        return url;
      }
      const encoded = Buffer.from(url).toString('base64url');
      return `${tiktokProxyBase}/v1/media/proxy/${encoded}`;
    });

    return {
      serverBaseUrl: this.serverBaseUrl,
      tiktokProxyBase,
      originalImages: images,
      proxyUrls: photos,
      tokenPrefix: this.currentAccessToken?.substring(0, 20) || 'NO_TOKEN',
      isEnabled: this.isEnabled(),
      autoPost: this.autoPost,
      hasClientKey: !!this.clientKey,
    };
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
