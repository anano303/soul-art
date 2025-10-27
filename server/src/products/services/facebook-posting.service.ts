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
      lines.push(
        `ფასი: ${finalPrice}${currency} (ფასდაკლება ${discountPct}% — ძველი ფასი ${product.price}${currency})`,
      );
      if (product.discountEndDate) {
        const end = new Date(product.discountEndDate);
        const y = end.getFullYear();
        const m = (end.getMonth() + 1).toString().padStart(2, '0');
        const d = end.getDate().toString().padStart(2, '0');
        lines.push(`ფასდაკლება მოქმედებს  ${y}-${m}-${d}-მდე`);
      }
    } else {
      lines.push(`ფასი: ${product.price}${currency}`);
    }

    return { message: lines.join('\n'), finalPrice };
  }

  private buildMessage(product: ProductDocument): string {
    const title = product.name || product.nameEn || 'პროდუქტი';
    const desc = product.description || product.descriptionEn || '';
    const { message: priceBlock } = this.formatPrice(product);
    const url = this.buildProductUrl(product);

    const parts: string[] = [
      `📌 ${title}`,
      desc ? `\n${desc}` : '',
      `\n${priceBlock}`,
      url ? `\n🔗 ნახვა/ყიდვა: ${url}` : '',
    ].filter(Boolean);

    return parts.join('\n');
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
      this.logger.error(
        'Facebook post failed',
        error?.response?.data || error.message,
      );
      return { success: false, error: error?.response?.data || error.message };
    }
  }
}
