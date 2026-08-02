import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
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

  /** Where a picked video waits between "file chosen" and "product saved". */
  private get pendingVideoDir(): string {
    return path.join(process.cwd(), 'uploads', 'pending-videos');
  }

  /**
   * Moves an uploaded video into a pending slot and returns its token.
   * Nothing is sent to YouTube yet — the product does not exist at this point,
   * so its link and details could not go into the description anyway.
   */
  async stagePendingVideo(
    tempPath: string,
    originalName: string,
  ): Promise<string> {
    await fsp.mkdir(this.pendingVideoDir, { recursive: true });

    const rawExt = path.extname(originalName || '').toLowerCase();
    const extension = /^\.[a-z0-9]{2,5}$/.test(rawExt) ? rawExt : '.mp4';
    const token = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    const target = path.join(this.pendingVideoDir, token);

    try {
      await fsp.rename(tempPath, target);
    } catch {
      // rename fails across devices/volumes — fall back to copy + remove.
      await fsp.copyFile(tempPath, target);
      await fsp.unlink(tempPath).catch(() => undefined);
    }

    this.logger.log(`📥 Video staged for later upload: ${token}`);
    return token;
  }

  /**
   * Fire-and-forget YouTube upload for an ALREADY SAVED product. Returns
   * immediately so neither the seller nor the admin waits for YouTube; the
   * worker patches the product with the video ids once it finishes.
   */
  queueProductVideoUpload(
    product: ProductDocument,
    user: UserDocument,
    videoToken?: string | null,
  ): void {
    if (!videoToken) return;
    void this.runPendingVideoUpload(product, user, videoToken).catch((error) =>
      this.logger.error(
        `❌ Pending YouTube upload failed for product ${product._id}: ${
          error instanceof Error ? error.message : error
        }`,
      ),
    );
  }

  private async runPendingVideoUpload(
    product: ProductDocument,
    user: UserDocument,
    videoToken: string,
  ): Promise<void> {
    const safeToken = path.basename(videoToken);
    if (!/^[\w.-]+$/.test(safeToken)) {
      this.logger.warn(`Rejected suspicious video token: ${videoToken}`);
      return;
    }

    const videoFilePath = path.join(this.pendingVideoDir, safeToken);
    if (!fs.existsSync(videoFilePath)) {
      this.logger.warn(`Staged video not found: ${videoFilePath}`);
      return;
    }

    if (!this.isYoutubeConfigured()) {
      this.logger.warn('YouTube not configured — dropping staged video.');
      await fsp.unlink(videoFilePath).catch(() => undefined);
      return;
    }

    // Built from the saved product, so the description carries the real
    // product link, the artist page and every detail.
    const metadata = this.buildVideoMetadata(product, user);

    this.spawnYoutubeWorker({
      productId: product._id.toString(),
      productName: String(product.name || ''),
      productDescription: String(product.description || ''),
      price: product.price || 0,
      discountPercentage: (product as any).discountPercentage || 0,
      brand: String(product.brand || ''),
      category: String(product.category || ''),
      userName: String(user.name || ''),
      userEmail: String(user.email || ''),
      userId: user._id.toString(),
      images: Array.isArray(product.images)
        ? product.images.map((img) => String(img)).filter(Boolean)
        : [],
      videoFilePath,
      // Pre-built metadata wins over whatever the worker would compose.
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      cleanupVideoFile: true,
    });
  }

  /**
   * Rewrites title/description/tags of videos that are already on YouTube so
   * old uploads get the product link too. No re-upload — a metadata-only
   * `videos.update` call per video.
   *
   * Costs 50 quota units per video against a 10.000/day budget, hence the
   * batch limit.
   */
  async resyncVideoMetadata(limit = 50): Promise<{
    scanned: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: string[];
  }> {
    const summary = {
      scanned: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (!this.isYoutubeConfigured()) {
      summary.errors.push('YouTube credentials are not configured');
      return summary;
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const products = await this.productModel
      .find({
        youtubeVideoId: { $exists: true, $nin: [null, ''] },
      })
      .sort({ updatedAt: -1 })
      .limit(safeLimit)
      .populate('user', 'name artistSlug email')
      .exec();

    summary.scanned = products.length;

    for (const product of products) {
      const videoId = (product as any).youtubeVideoId as string;
      const owner = (product as any).user as UserDocument | null;
      if (!videoId || !owner) {
        summary.skipped += 1;
        continue;
      }

      try {
        const metadata = this.buildVideoMetadata(
          product as unknown as ProductDocument,
          owner,
        );
        await this.youtubeService.updateVideo(videoId, {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
        });
        summary.updated += 1;
        this.logger.log(`♻️  Refreshed YouTube metadata for ${videoId}`);
      } catch (error) {
        summary.failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        summary.errors.push(`${videoId}: ${message}`);
        this.logger.warn(`Failed to refresh ${videoId}: ${message}`);
      }
    }

    return summary;
  }

  /**
   * Videos picked in a form that was never submitted would pile up on disk.
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupStaleStagedVideos(): Promise<void> {
    try {
      if (!fs.existsSync(this.pendingVideoDir)) return;
      const maxAgeMs = 24 * 60 * 60 * 1000;
      const now = Date.now();
      const entries = await fsp.readdir(this.pendingVideoDir);

      for (const entry of entries) {
        const filePath = path.join(this.pendingVideoDir, entry);
        try {
          const stat = await fsp.stat(filePath);
          if (now - stat.mtimeMs > maxAgeMs) {
            await fsp.unlink(filePath);
            this.logger.log(`🧹 Removed stale staged video: ${entry}`);
          }
        } catch {
          /* file vanished mid-sweep — nothing to do */
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to sweep staged videos: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  /**
   * Spawns the upload worker and wires its lifecycle: on success the product
   * gets its YouTube ids, on exit the staged file is removed.
   */
  private spawnYoutubeWorker(
    workerData: Record<string, unknown> & {
      productId: string;
      videoFilePath: string;
      cleanupVideoFile?: boolean;
    },
  ): void {
    const workerPath = path.join(__dirname, '../workers/youtube.worker.js');
    const worker = new Worker(workerPath, { workerData });

    worker.on('message', async (message) => {
      if (message?.success && message.data?.videoId) {
        try {
          await this.productModel.findByIdAndUpdate(message.data.productId, {
            youtubeVideoId: message.data.videoId,
            youtubeVideoUrl: message.data.videoUrl,
            youtubeEmbedUrl: message.data.embedUrl,
          });
          this.logger.log(
            `✅ Product ${message.data.productId} linked to YouTube video ${message.data.videoId}`,
          );
        } catch (error) {
          this.logger.error('❌ Failed to attach YouTube video:', error);
        }
      } else {
        this.logger.error(`❌ YouTube worker failed: ${message?.error}`);
      }
    });

    worker.on('error', (error) => {
      this.logger.error(`💥 YouTube worker error: ${error.message}`);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        this.logger.error(`❌ YouTube worker exited with code ${code}`);
      }
      if (workerData.cleanupVideoFile) {
        void fsp.unlink(workerData.videoFilePath).catch(() => undefined);
      }
    });
  }

  async handleProductVideoUpload({
    product,
    user,
    videoFile,
    imageFiles,
  }: ProductVideoPayload): Promise<YoutubeVideoResult | null> {
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log('🎬 YouTube Service Called - START');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log(`📦 Product ID: ${product._id}`);
    this.logger.log(`📹 Has Video File: ${!!videoFile}`);
    if (videoFile) {
      this.logger.log(
        `📹 Video File Size: ${videoFile.buffer?.length || 0} bytes`,
      );
      this.logger.log(`📹 Video File Name: ${videoFile.originalname}`);
    }
    this.logger.log(`🖼️  Image Files Count: ${imageFiles.length}`);
    this.logger.log(`🖼️  Product Images Count: ${product.images?.length ?? 0}`);
    if (product.images && product.images.length > 0) {
      this.logger.log(
        `🖼️  First 3 images: ${JSON.stringify(product.images.slice(0, 3))}`,
      );
    }
    this.logger.log(`👤 User: ${user.name} (${user.email})`);
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!this.isYoutubeConfigured()) {
      this.logger.warn(
        '❌ YouTube credentials missing. Skipping video upload.',
      );
      return null;
    }

    this.logger.log('✅ YouTube IS CONFIGURED - proceeding with Worker Thread');

    try {
      this.logger.log('📁 Step 1: Preparing video file (if exists)...');

      // ========================================
      // SLIDESHOW GENERATION TEMPORARILY DISABLED
      // ========================================
      // Only upload if user provided a video file
      // Images-only products will skip YouTube upload

      let videoFilePath: string | undefined;
      if (videoFile && videoFile.buffer) {
        const tempDir = await fsp.mkdtemp(
          path.join(os.tmpdir(), 'soulart-upload-'),
        );
        videoFilePath = path.join(tempDir, `video-${Date.now()}.mp4`);
        this.logger.log(`📁 Writing video to temp: ${videoFilePath}`);
        await fsp.writeFile(videoFilePath, videoFile.buffer);
        this.logger.log(`✅ Video file saved to temp location`);
      } else {
        this.logger.log(
          'ℹ️  No video file provided - skipping YouTube upload (slideshow generation disabled)',
        );
        this.logger.log('   Product will be saved with images only');
        return null; // Exit early - no YouTube upload needed
      }

      this.logger.log('📋 Step 2: Preparing Worker Thread data...');
      // Start worker thread for background processing
      const workerPath = path.join(__dirname, '../workers/youtube.worker.js');
      this.logger.log(`🔧 Worker script path: ${workerPath}`);

      // Ensure all data is serializable for Worker Thread
      this.logger.log('🔄 Converting product data to serializable format...');
      const workerData = {
        productId: product._id.toString(),
        productName: String(product.name || ''),
        productDescription: String(product.description || ''),
        price: product.price || 0,
        discountPercentage: product.discountPercentage || 0,
        brand: String(product.brand || ''),
        category: String(product.category || ''),
        userName: String(user.name || ''),
        userEmail: String(user.email || ''),
        userId: user._id.toString(),
        images: Array.isArray(product.images)
          ? product.images.map((img) => String(img)).filter(Boolean)
          : [],
        videoFilePath: videoFilePath ? String(videoFilePath) : undefined,
      };

      this.logger.log('✅ Worker data prepared:');
      this.logger.log(`   - Product ID: ${workerData.productId}`);
      this.logger.log(`   - Product Name: ${workerData.productName}`);
      this.logger.log(`   - Images Count: ${workerData.images.length}`);
      this.logger.log(`   - Has Video File: ${!!workerData.videoFilePath}`);
      this.logger.log(`   - User: ${workerData.userName}`);

      if (workerData.images.length > 0) {
        this.logger.log(
          `   - Sample Images: ${workerData.images.slice(0, 2).join(', ')}`,
        );
      }

      this.logger.log('🚀 Step 3: Spawning Worker Thread...');
      const worker = new Worker(workerPath, { workerData });
      this.logger.log('✅ Worker Thread spawned successfully!');

      worker.on('message', async (message) => {
        this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        this.logger.log('📬 WORKER MESSAGE RECEIVED');
        this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        this.logger.log(`Message: ${JSON.stringify(message, null, 2)}`);

        if (message.success) {
          this.logger.log('✅ Worker reported SUCCESS!');
          this.logger.log(`📦 Updating Product ${message.data.productId}...`);

          try {
            const updatedProduct = await this.productModel.findByIdAndUpdate(
              message.data.productId,
              {
                youtubeVideoId: message.data.videoId,
                youtubeVideoUrl: message.data.videoUrl,
                youtubeEmbedUrl: message.data.embedUrl,
              },
              { new: true },
            );

            if (updatedProduct) {
              this.logger.log('✅ Product updated successfully!');
              this.logger.log(`   - YouTube Video ID: ${message.data.videoId}`);
              this.logger.log(`   - YouTube URL: ${message.data.videoUrl}`);
            } else {
              this.logger.error('❌ Product not found during update!');
            }
          } catch (updateError) {
            this.logger.error('❌ Error updating product:', updateError);
          }
        } else {
          this.logger.error('❌ Worker reported FAILURE!');
          this.logger.error(`Error: ${message.error}`);
        }
        this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      });

      worker.on('error', (error) => {
        this.logger.error(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );
        this.logger.error('💥 WORKER THREAD ERROR');
        this.logger.error(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );
        this.logger.error(`Error: ${error.message}`);
        this.logger.error(`Stack: ${error.stack}`);
        this.logger.error(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );
      });

      worker.on('exit', (code) => {
        this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        this.logger.log('🚪 WORKER THREAD EXIT');
        this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        this.logger.log(`Exit Code: ${code}`);
        if (code !== 0) {
          this.logger.error(`❌ Worker exited with non-zero code: ${code}`);
        } else {
          this.logger.log('✅ Worker exited successfully');
        }
        this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      });

      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log('✅ YouTube video processing started in worker thread!');
      this.logger.log('ℹ️  Processing will continue in background...');
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Don't wait - return immediately
      return null;
    } catch (error) {
      this.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.error('💥 FAILED TO START WORKER THREAD');
      this.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.error(`Error Name: ${error.name}`);
      this.logger.error(`Error Message: ${error.message}`);
      this.logger.error(`Error Stack: ${error.stack}`);
      this.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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

  /**
   * Upload video to YouTube synchronously (waits for completion)
   * Used when creating products - video uploads first, then product is created with YouTube URL
   */
  async uploadVideoSync({
    productData,
    user,
    videoFile,
  }: {
    productData: {
      _id?: string;
      name: string;
      description?: string;
      price?: number;
      discountPercentage?: number;
      brand?: string;
      category?: string;
      images?: string[];
    };
    user: UserDocument;
    videoFile: BackgroundUploadFile;
  }): Promise<YoutubeVideoResult | null> {
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log('🎬 YouTube SYNC Upload - START');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!this.isYoutubeConfigured()) {
      this.logger.warn(
        '❌ YouTube credentials missing. Skipping video upload.',
      );
      return null;
    }

    if (!videoFile || !videoFile.buffer) {
      this.logger.warn('❌ No video file provided.');
      return null;
    }

    let tempDir: string | null = null;

    try {
      // Create temp directory and save video file
      tempDir = await fsp.mkdtemp(
        path.join(os.tmpdir(), 'soulart-sync-upload-'),
      );
      const videoFilePath = path.join(tempDir, `video-${Date.now()}.mp4`);

      this.logger.log(`📁 Saving video to temp: ${videoFilePath}`);
      await fsp.writeFile(videoFilePath, videoFile.buffer);
      this.logger.log(`✅ Video file saved (${videoFile.buffer.length} bytes)`);

      // Prepare YouTube upload options
      const title = `${productData.name} | SoulArt`.slice(0, 100);
      const description = this.buildYoutubeDescription(productData, user);
      const tags = this.buildYoutubeTags(productData);

      this.logger.log(`📤 Starting YouTube upload: "${title}"`);

      const uploadResult = await this.youtubeService.uploadVideo(
        videoFilePath,
        {
          title,
          description,
          tags,
          privacyStatus: 'public',
        },
      );

      if (uploadResult && uploadResult.videoId) {
        const result: YoutubeVideoResult = {
          videoId: uploadResult.videoId,
          videoUrl: `https://www.youtube.com/watch?v=${uploadResult.videoId}`,
          embedUrl: `https://www.youtube.com/embed/${uploadResult.videoId}`,
        };

        this.logger.log('✅ YouTube upload SUCCESS!');
        this.logger.log(`   - Video ID: ${result.videoId}`);
        this.logger.log(`   - URL: ${result.videoUrl}`);

        return result;
      }

      this.logger.warn('❌ YouTube upload returned no videoId');
      return null;
    } catch (error) {
      this.logger.error('❌ YouTube sync upload failed:', error);
      throw error;
    } finally {
      // Cleanup temp directory
      if (tempDir) {
        try {
          await fsp.rm(tempDir, { recursive: true, force: true });
          this.logger.log(`🧹 Cleaned up temp directory: ${tempDir}`);
        } catch (cleanupError) {
          this.logger.warn('Failed to cleanup temp directory:', cleanupError);
        }
      }
    }
  }

  private buildYoutubeDescription(
    productData: any,
    user: UserDocument,
  ): string {
    const lines = [
      `🎨 ${productData.name}`,
      '',
      productData.description || '',
      '',
      `💰 ფასი: ${productData.price || 0}₾`,
    ];

    if (productData.discountPercentage) {
      lines.push(`🏷️ ფასდაკლება: ${productData.discountPercentage}%`);
    }

    lines.push('');
    lines.push(`👤 გამყიდველი: ${user.name || 'SoulArt'}`);
    lines.push('');
    lines.push('🛒 შეიძინეთ: https://soulart.ge');
    lines.push('');
    lines.push('#SoulArt #ხელოვნება #საქართველო #art #georgia');

    return lines.join('\n');
  }

  private buildYoutubeTags(productData: any): string[] {
    const tags = [
      'SoulArt',
      'ხელოვნება',
      'საქართველო',
      'art',
      'georgia',
      'handmade',
      'ხელნაკეთი',
    ];

    if (productData.category) {
      tags.push(productData.category);
    }

    if (productData.brand) {
      tags.push(productData.brand);
    }

    return tags.slice(0, 30); // YouTube limit
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
