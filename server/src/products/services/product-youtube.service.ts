import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Worker } from 'worker_threads';
import { YoutubeService, VideoUploadOptions } from '@/youtube/youtube.service';
import { Product, ProductDocument } from '../schemas/product.schema';
import { UserDocument } from '@/users/schemas/user.schema';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface BackgroundUploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

interface ProductVideoPayload {
  product: ProductDocument;
  user: UserDocument;
  videoFile?: BackgroundUploadFile | null;
  imageFiles: BackgroundUploadFile[];
}

export interface YoutubeVideoResult {
  videoId: string;
  videoUrl: string;
  embedUrl: string;
}

@Injectable()
export class ProductYoutubeService {
  private readonly logger = new Logger(ProductYoutubeService.name);

  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly configService: ConfigService,
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async handleProductVideoUpload({
    product,
    user,
    videoFile,
    imageFiles,
  }: ProductVideoPayload): Promise<YoutubeVideoResult | null> {
    console.log('🎬 YouTube Service Called:', {
      productId: product._id,
      hasVideoFile: !!videoFile,
      imageFilesCount: imageFiles.length,
      productImagesCount: product.images?.length ?? 0,
    });

    if (!this.isYoutubeConfigured()) {
      this.logger.warn('YouTube credentials missing. Skipping video upload.');
      console.log('❌ YouTube not configured - missing credentials');
      return null;
    }

    console.log(
      '✅ YouTube configured, starting Worker Thread for video processing',
    );

    try {
      // Save video file to temp location if exists
      let videoFilePath: string | undefined;
      if (videoFile && videoFile.buffer) {
        const tempDir = await fsp.mkdtemp(
          path.join(os.tmpdir(), 'soulart-upload-'),
        );
        videoFilePath = path.join(tempDir, `video-${Date.now()}.mp4`);
        await fsp.writeFile(videoFilePath, videoFile.buffer);
      }

      // Start worker thread for background processing
      const workerPath = path.join(__dirname, '../workers/youtube.worker.js');
      const worker = new Worker(workerPath, {
        workerData: {
          productId: product._id.toString(),
          productName: product.name,
          productDescription: product.description,
          userName: user.name,
          userEmail: user.email,
          images: product.images || [],
          videoFilePath,
        },
      });

      worker.on('message', async (message) => {
        if (message.success) {
          // Update product with YouTube info
          await this.productModel.findByIdAndUpdate(
            message.data.productId,
            {
              youtubeVideoId: message.data.videoId,
              youtubeVideoUrl: message.data.videoUrl,
              youtubeEmbedUrl: message.data.embedUrl,
            },
            { new: true },
          );
          this.logger.log(
            `✅ Product ${message.data.productId} updated with YouTube video`,
          );
        } else {
          this.logger.error(`❌ Worker failed: ${message.error}`);
        }
      });

      worker.on('error', (error) => {
        this.logger.error('Worker thread error:', error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          this.logger.error(`Worker stopped with exit code ${code}`);
        }
      });

      this.logger.log(`🎬 YouTube video processing started in worker thread`);

      // Don't wait - return immediately
      return null;
    } catch (error) {
      this.logger.error(
        'Failed to start YouTube video processing worker',
        error as Error,
      );
      return null;
    }
  }

  private getSlideDurationSeconds(): number {
    const raw = this.configService.get<string>(
      'YOUTUBE_SLIDE_DURATION_SECONDS',
    );
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 30) {
      return parsed;
    }
    return 5;
  }

  private guessMimeTypeFromExtension(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      case '.gif':
        return 'image/gif';
      case '.avif':
        return 'image/avif';
      case '.mp3':
        return 'audio/mpeg';
      case '.m4a':
      case '.aac':
        return 'audio/aac';
      case '.wav':
        return 'audio/wav';
      case '.ogg':
      case '.oga':
        return 'audio/ogg';
      default:
        return null;
    }
  }

  private getExtensionFromMime(mimeType: string): string | null {
    if (!mimeType) {
      return null;
    }

    const normalized = mimeType.toLowerCase();
    switch (normalized) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      case 'image/avif':
        return '.avif';
      case 'audio/mpeg':
        return '.mp3';
      case 'audio/aac':
        return '.aac';
      case 'audio/wav':
        return '.wav';
      case 'audio/ogg':
        return '.ogg';
      default:
        return null;
    }
  }

  private isYoutubeConfigured(): boolean {
    const clientId = this.configService.get<string>('YOUTUBE_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'YOUTUBE_CLIENT_SECRET',
    );
    const refreshToken = this.configService.get<string>(
      'YOUTUBE_REFRESH_TOKEN',
    );

    console.log('🔧 YouTube Config Check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRefreshToken: !!refreshToken,
    });

    if (!clientId || !clientSecret || !refreshToken) {
      return false;
    }
    return true;
  }

  private async persistUploadedVideo(
    tempDir: string,
    videoFile: BackgroundUploadFile,
  ): Promise<string> {
    const extension = path.extname(videoFile.originalname) || '.mp4';
    const videoPath = path.join(tempDir, `uploaded${extension}`);
    await fsp.writeFile(videoPath, videoFile.buffer);
    return videoPath;
  }

  private buildVideoMetadata(
    product: ProductDocument,
    user: UserDocument,
  ): VideoUploadOptions {
    const title = this.truncate(`${product.name} • SoulArt`, 100);
    const baseUrl = this.resolveClientBaseUrl();
    const purchaseUrl = new URL(`/products/${product._id}`, baseUrl).toString();
    const artistUrl = user.artistSlug
      ? new URL(`/@${user.artistSlug}`, baseUrl).toString()
      : null;

    const descriptionSections: string[] = [];
    descriptionSections.push(`🎨 ${product.name}`);
    if (product.description) {
      descriptionSections.push('', this.truncate(product.description, 1500));
    }

    descriptionSections.push('');
    descriptionSections.push(`ფასი: ${product.price ?? '-'} ₾`);
    if (product.countInStock !== undefined) {
      descriptionSections.push(`მარაგი: ${product.countInStock}`);
    }
    if (Array.isArray(product.sizes) && product.sizes.length) {
      descriptionSections.push(`ზომები: ${product.sizes.join(', ')}`);
    }
    if (Array.isArray(product.colors) && product.colors.length) {
      descriptionSections.push(`ფერები: ${product.colors.join(', ')}`);
    }
    if (product.dimensions) {
      const { width, height, depth } = product.dimensions as Record<
        string,
        number
      >;
      const dimensionParts = [
        width ? `სიგანე: ${width} სმ` : null,
        height ? `სიმაღლე: ${height} სმ` : null,
        depth ? `სიღრმე: ${depth} სმ` : null,
      ].filter(Boolean);
      if (dimensionParts.length) {
        descriptionSections.push(dimensionParts.join(' • '));
      }
    }

    descriptionSections.push('');
    descriptionSections.push(`🛒 შესაძენად გადადით: ${purchaseUrl}`);
    if (artistUrl) {
      descriptionSections.push(
        `🖼️ ამ მხატვრის ყველა ნამუშევრის სანახავად გადადით: ${artistUrl}`,
      );
    }

    const hashtagLine = this.buildHashtagLine(product);
    if (hashtagLine) {
      descriptionSections.push('');
      descriptionSections.push(hashtagLine);
    }

    const description = descriptionSections.join('\n');
    const tags = this.buildTags(product, user);

    return {
      title,
      description,
      tags,
      privacyStatus: 'public',
      categoryId: '22',
    };
  }

  private buildTags(product: ProductDocument, user: UserDocument): string[] {
    const tagSet = new Set<string>();
    if (product.brand) tagSet.add(this.normalizeTag(product.brand));
    if (product.category) tagSet.add(this.normalizeTag(product.category));
    if (Array.isArray(product.hashtags)) {
      product.hashtags
        .map((tag: string) => tag.replace(/^#/, ''))
        .forEach((tag) => tagSet.add(this.normalizeTag(tag)));
    }
    if (user.artistSlug) tagSet.add(this.normalizeTag(user.artistSlug));
    if (Array.isArray(product.colors)) {
      product.colors.forEach((color: string) =>
        tagSet.add(this.normalizeTag(color)),
      );
    }
    if (Array.isArray(product.sizes)) {
      product.sizes.forEach((size: string) =>
        tagSet.add(this.normalizeTag(size)),
      );
    }

    return Array.from(tagSet).filter(Boolean).slice(0, 15);
  }

  private slugify(value: string, replaceSpaceWithDash = true): string {
    if (!value) return '';
    const normalized = value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, replaceSpaceWithDash ? '-' : '')
      .replace(/-+/g, '-');
    return normalized;
  }

  private truncate(value: string, max: number): string {
    if (!value) return '';
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
  }

  private buildHashtagLine(product: ProductDocument): string {
    if (!Array.isArray(product.hashtags) || !product.hashtags.length) {
      return '';
    }

    const formatted = Array.from(
      new Set(
        product.hashtags
          .map((tag: string) => tag?.toString().trim())
          .filter(Boolean)
          .map((tag: string) => (tag.startsWith('#') ? tag : `#${tag}`))
          .map((tag: string) => tag.replace(/\s+/g, '')),
      ),
    ).slice(0, 15);

    return formatted.join(' ');
  }

  private normalizeTag(value: string): string {
    if (!value) {
      return '';
    }

    return value.toString().trim().replace(/^#/, '').replace(/\s+/g, '-');
  }

  private resolveClientBaseUrl(): string {
    return (
      this.configService.get<string>('PUBLIC_CLIENT_URL') ||
      this.configService.get<string>('CLIENT_URL') ||
      this.configService.get<string>('NEXT_PUBLIC_CLIENT_URL') ||
      'https://soulart.ge'
    );
  }

  private async safeRemoveDir(targetDir: string) {
    try {
      if (fs.existsSync(targetDir)) {
        await fsp.rm(targetDir, { recursive: true, force: true });
      }
    } catch (error) {
      this.logger.warn(
        `Failed to cleanup temp directory: ${targetDir}`,
        error as Error,
      );
    }
  }

  private async cleanupUploadedFiles(
    videoFile: BackgroundUploadFile | null,
    imageFiles: BackgroundUploadFile[],
  ): Promise<void> {
    // Note: We can't reliably cleanup the original uploaded files here
    // because we don't have access to their original file paths.
    // The controller handles cleanup based on whether YouTube processing is needed.
    this.logger.debug(
      'YouTube processing completed, original file cleanup handled by controller',
    );
  }
}
