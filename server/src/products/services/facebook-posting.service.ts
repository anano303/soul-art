import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ProductDocument } from '../schemas/product.schema';
import {
  TikTokPostingService,
  TikTokPostResult,
} from './tiktok-posting.service';

export interface PostResult {
  success: boolean;
  postId?: string;
  error?: any;
}

export interface MultiPostResult {
  success: boolean;
  pagePost?: PostResult;
  groupPosts?: PostResult[];
  instagramPost?: PostResult;
  tiktokPost?: TikTokPostResult;
  errors?: any[];
}

@Injectable()
export class FacebookPostingService {
  private readonly logger = new Logger(FacebookPostingService.name);
  // Allow dedicated envs for posting so Pixel or other tokens don't conflict
  private readonly pageId =
    process.env.FACEBOOK_POSTS_PAGE_ID || process.env.FACEBOOK_PAGE_ID;
  private readonly pageAccessToken =
    process.env.FACEBOOK_POSTS_PAGE_ACCESS_TOKEN ||
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  // Facebook Groups configuration (comma-separated group IDs)
  private readonly groupIds = process.env.FACEBOOK_GROUP_IDS
    ? process.env.FACEBOOK_GROUP_IDS.split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

  // Instagram configuration
  private readonly instagramAccountId = process.env.INSTAGRAM_ACCOUNT_ID || '';

  // TikTok configuration
  private readonly autoPostTikTok =
    (process.env.TIKTOK_AUTO_POST || 'false').toLowerCase() === 'true';

  private readonly autoPostFlag = (
    process.env.FACEBOOK_AUTO_POST || 'true'
  ).toLowerCase();
  private readonly autoPostGroups =
    (process.env.FACEBOOK_AUTO_POST_GROUPS || 'false').toLowerCase() === 'true';
  private readonly autoPostInstagram =
    (process.env.INSTAGRAM_AUTO_POST || 'false').toLowerCase() === 'true';

  private readonly allowedOrigins = process.env.ALLOWED_ORIGINS || '';
  private readonly serverBaseUrl = process.env.SERVER_BASE_URL || '';

  constructor(private readonly tiktokService: TikTokPostingService) {}

  private isEnabled(): boolean {
    // Respect FACEBOOK_AUTO_POST=false to disable without removing tokens
    return Boolean(
      this.pageId && this.pageAccessToken && this.autoPostFlag !== 'false',
    );
  }

  private getPublicBaseUrl(): string {
    // Prefer ALLOWED_ORIGINS (first entry) for public links, fallback to SERVER_BASE_URL
    // ALLOWED_ORIGINS may be comma-separated
    const firstOrigin = this.allowedOrigins
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)[0];

    const base = (firstOrigin || this.serverBaseUrl || '').replace(/\/$/, '');
    return base;
  }

  private buildProductUrl(product: ProductDocument): string {
    const base = this.getPublicBaseUrl();
    const slugOrId = (product as any).slug || product._id;
    return `${base}/products/${slugOrId}`;
  }

  private formatPrice(product: ProductDocument): {
    message: string;
    finalPrice: number;
  } {
    const currency = '₾';

    const now = new Date();
    const hasDiscount = (product.discountPercentage || 0) > 0;
    const startOk =
      !product.discountStartDate || new Date(product.discountStartDate) <= now;
    const endOk =
      !product.discountEndDate || new Date(product.discountEndDate) >= now;
    const activeDiscount = hasDiscount && startOk && endOk;

    let finalPrice = product.price;
    let lines: string[] = [];

    if (activeDiscount) {
      const discountPct = product.discountPercentage || 0;
      const discountAmount = (product.price * discountPct) / 100;
      finalPrice = Math.max(
        0,
        Math.round((product.price - discountAmount) * 100) / 100,
      );
      // Use emojis and plain text newlines for Facebook captions (HTML is not rendered)
      lines.push(`💰 ფასი: ${finalPrice}${currency}`);
      lines.push(
        `🔻 ფასდაკლება: ${discountPct}% — ძველი ფასი ${product.price}${currency}`,
      );
      if (product.discountEndDate) {
        const end = new Date(product.discountEndDate);
        const y = end.getFullYear();
        const m = (end.getMonth() + 1).toString().padStart(2, '0');
        const d = end.getDate().toString().padStart(2, '0');
        lines.push(`⏳ მოქმედებს ${y}-${m}-${d}-მდე`);
      }
    } else {
      lines.push(`💰 ფასი: ${product.price}${currency}`);
    }

    return { message: lines.join('\n'), finalPrice };
  }

  private buildMessage(product: ProductDocument): string {
    const title = product.name || product.nameEn || 'პროდუქტი';
    const desc = product.description || product.descriptionEn || '';
    const { message: priceBlock } = this.formatPrice(product);
    const url = this.buildProductUrl(product);
    const tags = this.formatHashtags(product);
    const author = this.getAuthor(product);
    const sellerUrl = this.getSellerProfileUrl(product);

    // Add material, dimensions, and original info
    const materialInfo = this.formatMaterials(product);
    const dimensionInfo = this.formatDimensions(product);
    const originalInfo = this.formatOriginalStatus(product);

    const parts: string[] = [
      `📌 ${title}`,
      author ? `✍️ ავტორი: ${author}` : '',
      desc ? `${desc}` : '',
      originalInfo ? `${originalInfo}` : '',
      materialInfo ? `${materialInfo}` : '',
      dimensionInfo ? `${dimensionInfo}` : '',
      `${priceBlock}`,
      url ? `🔗 ნახვა/ყიდვა: ${url}` : '',
      sellerUrl ? `👤 ავტორის გვერდი: ${sellerUrl}` : '',
      tags ? `${tags}` : '',
    ].filter(Boolean);

    return parts.join('\n');
  }

  private formatOriginalStatus(product: ProductDocument): string | null {
    const anyProd: any = product as any;
    if (anyProd.isOriginal === undefined || anyProd.isOriginal === null) {
      return null;
    }
    return anyProd.isOriginal ? '✅ ორიგინალი' : '🖼️ ასლი';
  }

  private formatMaterials(product: ProductDocument): string | null {
    const anyProd: any = product as any;
    const materials = Array.isArray(anyProd.materials)
      ? anyProd.materials.filter(Boolean).slice(0, 3)
      : [];

    if (materials.length === 0) return null;

    return `🎨 მასალა: ${materials.join(', ')}`;
  }

  private formatDimensions(product: ProductDocument): string | null {
    const anyProd: any = product as any;
    const dims = anyProd.dimensions;

    if (!dims) return null;

    const { width, height, depth } = dims;

    if (!width && !height && !depth) return null;

    const parts: string[] = [];
    if (width) parts.push(`${width}`);
    if (height) parts.push(`${height}`);
    if (depth) parts.push(`${depth}`);

    return parts.length > 0 ? `📏 ზომა: ${parts.join('×')} სმ` : null;
  }

  private getAuthor(product: ProductDocument): string | null {
    const anyProd: any = product as any;
    // Prefer explicit brand; else try populated user.storeName or user.name
    const brand = anyProd.brand as string | undefined;
    const storeName = anyProd.user?.storeName as string | undefined;
    const userName = anyProd.user?.name as string | undefined;
    const artistSlug = anyProd.user?.artistSlug as string | undefined;
    const author = brand || storeName || userName || null;
    // Optionally append slug if available
    if (author && artistSlug) {
      return `${author} (${artistSlug})`;
    }
    return author;
  }

  private getSellerProfileUrl(product: ProductDocument): string | null {
    const anyProd: any = product as any;
    const base = this.getPublicBaseUrl();
    const artistSlug = anyProd.user?.artistSlug as string | undefined;
    if (!base || !artistSlug) return null;
    return `${base}/@${artistSlug}`;
  }

  private formatHashtags(product: ProductDocument): string {
    const raw = Array.isArray((product as any).hashtags)
      ? ((product as any).hashtags as string[])
      : [];

    // Normalize: trim, drop empty, ensure starts with #, replace spaces with underscores
    const cleaned = raw
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter(Boolean)
      .map((t) => t.replace(/^#+/, '')) // remove leading # if present
      .map((t) => t.replace(/\s+/g, '_')) // spaces to underscores
      .map((t) => t.replace(/[^\p{L}\p{N}_-]+/gu, '')) // keep letters (any language), numbers, _ and -
      .filter(Boolean)
      .map((t) => `#${t}`);

    // Deduplicate and limit count to keep caption readable (e.g., 10)
    const seen = new Set<string>();
    const uniqueLimited: string[] = [];
    for (const tag of cleaned) {
      if (!seen.has(tag)) {
        seen.add(tag);
        uniqueLimited.push(tag);
        if (uniqueLimited.length >= 10) break;
      }
    }

    return uniqueLimited.length ? uniqueLimited.join(' ') : '';
  }

  private async uploadPhotosUnpublished(
    imageUrls: string[],
  ): Promise<string[]> {
    const ids: string[] = [];
    for (const url of imageUrls) {
      try {
        const res = await axios.post(
          `https://graph.facebook.com/v19.0/${this.pageId}/photos`,
          null,
          {
            params: {
              url,
              published: false,
              access_token: this.pageAccessToken,
            },
          },
        );
        if (res.data && res.data.id) {
          ids.push(res.data.id);
        }
      } catch (err: any) {
        this.logger.warn(
          `Photo upload failed for ${url}: ${err?.response?.data?.error?.message || err.message}`,
        );
      }
    }
    return ids;
  }

  async postApprovedProduct(product: ProductDocument): Promise<PostResult> {
    try {
      if (!this.isEnabled()) {
        this.logger.debug(
          'Facebook posting disabled: missing PAGE_ID or ACCESS_TOKEN',
        );
        return { success: false, error: 'FB_DISABLED' };
      }

      const message = this.buildMessage(product);
      const images = Array.isArray(product.images)
        ? product.images.filter(Boolean)
        : [];

      const imageLimit = 5;
      const imagesToPost = images.slice(0, imageLimit);

      if (imagesToPost.length === 1) {
        const res = await axios.post(
          `https://graph.facebook.com/v19.0/${this.pageId}/photos`,
          null,
          {
            params: {
              url: imagesToPost[0],
              caption: message,
              access_token: this.pageAccessToken,
              published: true,
            },
          },
        );
        return { success: true, postId: res.data?.post_id || res.data?.id };
      }

      let attached_media: { media_fbid: string }[] = [];
      if (imagesToPost.length > 1) {
        const uploadedIds = await this.uploadPhotosUnpublished(imagesToPost);
        attached_media = uploadedIds.map((id) => ({ media_fbid: id }));
      }

      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${this.pageId}/feed`,
        null,
        {
          params: {
            message,
            access_token: this.pageAccessToken,
            ...(attached_media.length > 0
              ? { attached_media: attached_media }
              : {}),
          },
        },
      );

      return { success: true, postId: res.data?.id };
    } catch (error: any) {
      const errPayload = error?.response?.data || { message: error.message };
      // Add friendlier hint for common permission mistake
      const msg = errPayload?.error?.message || errPayload?.message || '';
      if (/publish_actions/i.test(msg)) {
        this.logger.error('Facebook post failed', errPayload);
        this.logger.warn(
          '[FB] Hint: Use a Page Access Token with pages_manage_posts (and pages_read_engagement). Do not use user/app/pixel tokens. Generate a Page token via /me/accounts after granting pages_manage_posts to the user in the app, then use that Page token in FACEBOOK_POSTS_PAGE_ACCESS_TOKEN.',
        );
      } else {
        this.logger.error('Facebook post failed', errPayload);
      }
      return { success: false, error: errPayload };
    }
  }

  /**
   * Post to Facebook Group
   */
  private async postToGroup(
    groupId: string,
    product: ProductDocument,
  ): Promise<PostResult> {
    try {
      const message = this.buildMessage(product);
      const images = Array.isArray(product.images)
        ? product.images.filter(Boolean).slice(0, 5)
        : [];

      if (images.length === 0) {
        // Text-only post
        const res = await axios.post(
          `https://graph.facebook.com/v19.0/${groupId}/feed`,
          null,
          {
            params: {
              message,
              access_token: this.pageAccessToken,
            },
          },
        );
        return { success: true, postId: res.data?.id };
      }

      if (images.length === 1) {
        // Single photo post
        const res = await axios.post(
          `https://graph.facebook.com/v19.0/${groupId}/photos`,
          null,
          {
            params: {
              url: images[0],
              caption: message,
              access_token: this.pageAccessToken,
            },
          },
        );
        return { success: true, postId: res.data?.id };
      }

      // Multiple photos - upload unpublished first
      const uploadedIds = await this.uploadPhotosUnpublishedForGroup(
        groupId,
        images,
      );
      const attached_media = uploadedIds.map((id) => ({ media_fbid: id }));

      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${groupId}/feed`,
        null,
        {
          params: {
            message,
            access_token: this.pageAccessToken,
            attached_media,
          },
        },
      );

      return { success: true, postId: res.data?.id };
    } catch (error: any) {
      const errPayload = error?.response?.data || { message: error.message };
      this.logger.error(`Facebook Group ${groupId} post failed`, errPayload);
      return { success: false, error: errPayload };
    }
  }

  /**
   * Upload photos unpublished for group
   */
  private async uploadPhotosUnpublishedForGroup(
    groupId: string,
    imageUrls: string[],
  ): Promise<string[]> {
    const ids: string[] = [];
    for (const url of imageUrls) {
      try {
        const res = await axios.post(
          `https://graph.facebook.com/v19.0/${groupId}/photos`,
          null,
          {
            params: {
              url,
              published: false,
              access_token: this.pageAccessToken,
            },
          },
        );
        if (res.data && res.data.id) {
          ids.push(res.data.id);
        }
      } catch (err: any) {
        this.logger.warn(
          `Group photo upload failed for ${url}: ${err?.response?.data?.error?.message || err.message}`,
        );
      }
    }
    return ids;
  }

  /**
   * Post to Instagram (requires Instagram Business Account connected to Facebook Page)
   */
  private async postToInstagram(product: ProductDocument): Promise<PostResult> {
    try {
      if (!this.instagramAccountId) {
        return { success: false, error: 'INSTAGRAM_ACCOUNT_ID not configured' };
      }

      const message = this.buildMessage(product);
      const images = Array.isArray(product.images)
        ? product.images.filter(Boolean)
        : [];

      if (images.length === 0) {
        return {
          success: false,
          error: 'No images available for Instagram post',
        };
      }

      // Instagram API requires a two-step process:
      // 1. Create a container (media object)
      // 2. Publish the container

      const imageUrl = images[0]; // Instagram single image for now

      // Step 1: Create container
      const containerRes = await axios.post(
        `https://graph.facebook.com/v19.0/${this.instagramAccountId}/media`,
        null,
        {
          params: {
            image_url: imageUrl,
            caption: message,
            access_token: this.pageAccessToken,
          },
        },
      );

      const creationId = containerRes.data?.id;
      if (!creationId) {
        throw new Error('Failed to create Instagram media container');
      }

      // Wait a moment for Instagram to process the image
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 2: Publish
      const publishRes = await axios.post(
        `https://graph.facebook.com/v19.0/${this.instagramAccountId}/media_publish`,
        null,
        {
          params: {
            creation_id: creationId,
            access_token: this.pageAccessToken,
          },
        },
      );

      return { success: true, postId: publishRes.data?.id };
    } catch (error: any) {
      const errPayload = error?.response?.data || { message: error.message };
      this.logger.error('Instagram post failed', errPayload);
      return { success: false, error: errPayload };
    }
  }

  /**
   * Post to TikTok only
   */
  async postToTikTok(product: ProductDocument, options?: any) {
    if (!this.tiktokService.isEnabled()) {
      return { success: false, error: 'TikTok posting is not configured' };
    }
    return this.tiktokService.postProduct(product, options);
  }

  /**
   * Query TikTok creator info for UX display
   */
  async queryTikTokCreatorInfo() {
    return this.tiktokService.queryCreatorInfo();
  }

  /**
   * Check if TikTok is enabled
   */
  isTikTokEnabled(): boolean {
    return this.tiktokService.isEnabled();
  }

  /**
   * Debug TikTok proxy URLs for a product
   */
  debugTikTokProxyUrls(product: ProductDocument): any {
    return this.tiktokService.debugProxyUrls(product);
  }

  /**
   * Post to all enabled platforms (Page, Groups, Instagram, TikTok)
   */
  async postToAllPlatforms(product: ProductDocument): Promise<MultiPostResult> {
    const result: MultiPostResult = {
      success: true,
      errors: [],
    };

    // 1. Post to Facebook Page
    if (this.isEnabled() && this.autoPostFlag !== 'false') {
      try {
        const pageResult = await this.postApprovedProduct(product);
        result.pagePost = pageResult;
        if (!pageResult.success) {
          result.success = false;
          result.errors?.push({
            platform: 'Facebook Page',
            error: pageResult.error,
          });
        } else {
          this.logger.log(`Posted to Facebook Page: ${pageResult.postId}`);
        }
      } catch (error) {
        result.success = false;
        result.errors?.push({ platform: 'Facebook Page', error });
        this.logger.error('Failed to post to Facebook Page', error);
      }
    }

    // 2. Post to Facebook Groups
    if (this.autoPostGroups && this.groupIds.length > 0) {
      result.groupPosts = [];
      for (const groupId of this.groupIds) {
        try {
          const groupResult = await this.postToGroup(groupId, product);
          result.groupPosts.push(groupResult);
          if (!groupResult.success) {
            result.success = false;
            result.errors?.push({
              platform: `Facebook Group ${groupId}`,
              error: groupResult.error,
            });
          } else {
            this.logger.log(
              `Posted to Facebook Group ${groupId}: ${groupResult.postId}`,
            );
          }
        } catch (error) {
          result.success = false;
          result.errors?.push({ platform: `Facebook Group ${groupId}`, error });
          this.logger.error(
            `Failed to post to Facebook Group ${groupId}`,
            error,
          );
        }
      }
    }

    // 3. Post to Instagram
    if (this.autoPostInstagram && this.instagramAccountId) {
      try {
        const instagramResult = await this.postToInstagram(product);
        result.instagramPost = instagramResult;
        if (!instagramResult.success) {
          result.success = false;
          result.errors?.push({
            platform: 'Instagram',
            error: instagramResult.error,
          });
        } else {
          this.logger.log(`Posted to Instagram: ${instagramResult.postId}`);
        }
      } catch (error) {
        result.success = false;
        result.errors?.push({ platform: 'Instagram', error });
        this.logger.error('Failed to post to Instagram', error);
      }
    }

    // 4. Post to TikTok (only if product has video)
    if (this.autoPostTikTok && this.tiktokService.isEnabled()) {
      try {
        const tiktokResult = await this.tiktokService.postProduct(product);
        result.tiktokPost = tiktokResult;
        if (!tiktokResult.success) {
          // Don't mark as failed if it's just NO_VIDEO_AVAILABLE
          if (tiktokResult.error !== 'NO_VIDEO_AVAILABLE') {
            result.errors?.push({
              platform: 'TikTok',
              error: tiktokResult.error,
            });
          }
        } else {
          this.logger.log(`Posted to TikTok: ${tiktokResult.publishId}`);
        }
      } catch (error) {
        result.errors?.push({ platform: 'TikTok', error });
        this.logger.error('Failed to post to TikTok', error);
      }
    }

    return result;
  }
}
