import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ProductDocument } from '../schemas/product.schema';

interface PostResult {
  success: boolean;
  postId?: string;
  error?: any;
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
  private readonly autoPostFlag = (
    process.env.FACEBOOK_AUTO_POST || 'true'
  ).toLowerCase();
  private readonly allowedOrigins = process.env.ALLOWED_ORIGINS || '';
  private readonly serverBaseUrl = process.env.SERVER_BASE_URL || '';

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
    return `${base}/product/${slugOrId}`;
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
      lines.push(`🔻 ფასდაკლება: ${discountPct}% — ძველი ფასი ${product.price}${currency}`);
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

    const parts: string[] = [
      `📌 ${title}`,
      author ? `\n✍️ ავტორი: ${author}` : '',
      desc ? `\n${desc}` : '',
      `\n${priceBlock}`,
      url ? `\n🔗 ნახვა/ყიდვა: ${url}` : '',
      sellerUrl ? `\n👤 ავტორის გვერდი: ${sellerUrl}` : '',
      tags ? `\n${tags}` : '',
    ].filter(Boolean);

    return parts.join('\n');
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
}
