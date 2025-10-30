import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YoutubeService, VideoUploadOptions } from '@/youtube/youtube.service';
import { ProductDocument } from '../schemas/product.schema';
import { UserDocument } from '@/users/schemas/user.schema';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fork, ChildProcess } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import sharp from 'sharp';
import axios from 'axios';

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
  private readonly maxSlides = 50;
  private outroSlide: BackgroundUploadFile | null | undefined;
  private audioTrack: BackgroundUploadFile | null | undefined;

  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly configService: ConfigService,
  ) {
    if (ffmpegInstaller?.path) {
      ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    }
    if (ffprobeInstaller?.path) {
      ffmpeg.setFfprobePath(ffprobeInstaller.path);
    }
  }

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

    console.log('✅ YouTube is configured, proceeding with upload');

    let tempDir: string | null = null;

    try {
      tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'soulart-product-'));

      // Spawn worker process for video processing
      const workerPath = path.join(__dirname, 'youtube-worker.js');
      const worker = fork(workerPath, [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: {
          ...process.env,
          // Pass necessary environment variables to worker
          YOUTUBE_CLIENT_ID: this.configService.get('YOUTUBE_CLIENT_ID'),
          YOUTUBE_CLIENT_SECRET: this.configService.get(
            'YOUTUBE_CLIENT_SECRET',
          ),
          YOUTUBE_REFRESH_TOKEN: this.configService.get(
            'YOUTUBE_REFRESH_TOKEN',
          ),
        },
      });

      return await this.processWithWorker(worker, {
        type: 'process_video',
        product: product.toObject ? product.toObject() : product,
        user: user.toObject ? user.toObject() : user,
        videoFile,
        imageFiles,
        tempDir,
      });
    } catch (error) {
      this.logger.error(
        'Failed to process product video with worker',
        error as Error,
      );
      return null;
    } finally {
      if (tempDir) {
        await this.safeRemoveDir(tempDir);
      }
      // Clean up original uploaded files after YouTube processing
      await this.cleanupUploadedFiles(videoFile, imageFiles);
    }
  }

  private async processWithWorker(
    worker: ChildProcess,
    message: any,
  ): Promise<YoutubeVideoResult | null> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => {
          worker.kill('SIGTERM');
          this.logger.error(
            'YouTube worker processing timeout - killed worker',
          );
          resolve(null); // Don't reject, just return null to prevent main process crash
        },
        15 * 60 * 1000,
      ); // 15 minutes timeout

      worker.on('message', (response: any) => {
        clearTimeout(timeout);
        worker.kill('SIGTERM');

        if (response.success) {
          resolve(response.result);
        } else {
          this.logger.error('YouTube worker failed:', response.error);
          resolve(null); // Return null instead of throwing to prevent crash
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        worker.kill('SIGTERM');
        this.logger.error('YouTube worker process error:', error);
        resolve(null); // Return null instead of throwing
      });

      worker.on('exit', (code, signal) => {
        clearTimeout(timeout);
        if (code && code !== 0) {
          this.logger.error(
            `YouTube worker exited with code ${code}, signal: ${signal}`,
          );
        }
        // Don't resolve here as message handler should have already resolved
      });

      // Send the processing message to worker
      worker.send(message);
    });
  }

  private async fetchImagesFromProduct(
    product: ProductDocument,
  ): Promise<BackgroundUploadFile[]> {
    if (!product || !Array.isArray(product.images) || !product.images.length) {
      return [];
    }

    const validUrls = product.images
      .map((url) => {
        try {
          return new URL(url).toString();
        } catch {
          return null;
        }
      })
      .filter((url): url is string => !!url)
      .slice(0, this.maxSlides);

    if (!validUrls.length) {
      return [];
    }

    this.logger.log(
      `No uploaded images provided. Fetching ${validUrls.length} product image(s) for slideshow generation.`,
    );

    const results: BackgroundUploadFile[] = [];

    for (const [index, imageUrl] of validUrls.entries()) {
      try {
        const response = await axios.get<ArrayBuffer>(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 15000,
        });

        const parsedUrl = new URL(imageUrl);
        const extension = path.extname(parsedUrl.pathname) || '.jpg';
        const mimetype =
          (response.headers['content-type'] as string | undefined) ||
          this.guessMimeTypeFromExtension(parsedUrl.pathname) ||
          'image/jpeg';

        results.push({
          buffer: Buffer.from(response.data),
          originalname: `product-image-${index + 1}${extension}`,
          mimetype,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to download product image for slideshow: ${imageUrl}`,
          error as Error,
        );
      }
    }

    return results;
  }

  private async generateSlideshowVideo(
    tempDir: string,
    imageFiles: BackgroundUploadFile[],
    productName: string,
  ): Promise<string | null> {
    if (!imageFiles.length) {
      this.logger.warn('Cannot generate slideshow without images.');
      return null;
    }

    const slideDuration = this.getSlideDurationSeconds();
    const outroSlide = await this.getOutroSlide();
    const audioTrack = await this.getAudioTrack();
    const maxImageCount = outroSlide ? this.maxSlides - 1 : this.maxSlides;
    const limitedImages = imageFiles.slice(0, Math.max(maxImageCount, 0));
    const slides: BackgroundUploadFile[] = [...limitedImages];

    if (outroSlide) {
      slides.push({
        buffer: Buffer.from(outroSlide.buffer),
        originalname: outroSlide.originalname,
        mimetype: outroSlide.mimetype,
      });
    }

    const framesDir = path.join(tempDir, 'frames');
    await fsp.mkdir(framesDir, { recursive: true });

    // Process images sequentially to reduce memory usage
    for (let index = 0; index < slides.length; index++) {
      const file = slides[index];
      const frameName = `frame-${String(index + 1).padStart(3, '0')}.jpg`;
      const framePath = path.join(framesDir, frameName);

      try {
        await sharp(Buffer.from(file.buffer))
          .resize(1920, 1080, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          })
          .jpeg({ quality: 85 }) // Reduced quality to save memory
          .toFile(framePath);

        // Force garbage collection of buffer
        file.buffer = null as any;
      } catch (error) {
        this.logger.error(`Failed to process slide ${index + 1}:`, error);
        throw error;
      }
    }
    const outputPath = path.join(tempDir, `${this.slugify(productName)}.mp4`);
    let audioPath: string | null = null;

    if (audioTrack) {
      const audioExtension =
        path.extname(audioTrack.originalname) ||
        this.getExtensionFromMime(audioTrack.mimetype) ||
        '.mp3';
      audioPath = path.join(tempDir, `audio-track${audioExtension}`);
      await fsp.writeFile(audioPath, Buffer.from(audioTrack.buffer));
    }

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg()
        .addInput(path.join(framesDir, 'frame-%03d.jpg'))
        .inputOptions([`-framerate 1/${slideDuration}`])
        .videoFilters([
          'scale=1920:1080:force_original_aspect_ratio=decrease',
          'pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
        ]);

      const outputOptions = ['-c:v libx264', '-pix_fmt yuv420p', '-r 30'];

      if (audioPath) {
        command.addInput(audioPath);
        outputOptions.push('-shortest');
        outputOptions.push('-c:a aac', '-b:a 192k');
      } else {
        outputOptions.push('-an');
      }

      command
        .outputOptions(outputOptions)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath);
    });

    return outputPath;
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

  private async getOutroSlide(): Promise<BackgroundUploadFile | null> {
    if (this.outroSlide !== undefined) {
      return this.outroSlide;
    }

    const imageUrl = this.configService.get<string>(
      'SLIDESHOW_OUTRO_IMAGE_URL',
    );
    const imagePath = this.configService.get<string>(
      'SLIDESHOW_OUTRO_IMAGE_PATH',
    );

    if (!imageUrl && !imagePath) {
      this.outroSlide = null;
      return this.outroSlide;
    }

    try {
      if (imageUrl) {
        const response = await axios.get<ArrayBuffer>(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
        });

        const url = new URL(imageUrl);
        const originalname = path.basename(url.pathname) || 'outro.jpg';
        const mimetype =
          (response.headers['content-type'] as string | undefined) ||
          this.guessMimeTypeFromExtension(originalname) ||
          'image/jpeg';

        this.outroSlide = {
          buffer: Buffer.from(response.data),
          originalname,
          mimetype,
        };

        return this.outroSlide;
      }

      if (imagePath) {
        const resolvedPath = path.isAbsolute(imagePath)
          ? imagePath
          : path.resolve(process.cwd(), imagePath);
        const buffer = await fsp.readFile(resolvedPath);
        const originalname = path.basename(resolvedPath);
        const mimetype =
          this.guessMimeTypeFromExtension(resolvedPath) || 'image/jpeg';

        this.outroSlide = { buffer, originalname, mimetype };
        return this.outroSlide;
      }
    } catch (error) {
      this.logger.warn('Failed to load outro slide image', error as Error);
    }

    this.outroSlide = null;
    return this.outroSlide;
  }

  private async getAudioTrack(): Promise<BackgroundUploadFile | null> {
    if (this.audioTrack !== undefined) {
      return this.audioTrack;
    }

    const audioUrl = this.configService.get<string>('SLIDESHOW_AUDIO_URL');
    const audioPath = this.configService.get<string>('SLIDESHOW_AUDIO_PATH');

    if (!audioUrl && !audioPath) {
      this.audioTrack = null;
      return this.audioTrack;
    }

    try {
      if (audioUrl) {
        const response = await axios.get<ArrayBuffer>(audioUrl, {
          responseType: 'arraybuffer',
          timeout: 15000,
        });

        const url = new URL(audioUrl);
        const originalname = path.basename(url.pathname) || 'slideshow-audio';
        const mimetype =
          (response.headers['content-type'] as string | undefined) ||
          this.guessMimeTypeFromExtension(originalname) ||
          'audio/mpeg';

        this.audioTrack = {
          buffer: Buffer.from(response.data),
          originalname,
          mimetype,
        };

        return this.audioTrack;
      }

      if (audioPath) {
        const resolvedPath = path.isAbsolute(audioPath)
          ? audioPath
          : path.resolve(process.cwd(), audioPath);
        const buffer = await fsp.readFile(resolvedPath);
        const originalname = path.basename(resolvedPath);
        const mimetype =
          this.guessMimeTypeFromExtension(resolvedPath) || 'audio/mpeg';

        this.audioTrack = { buffer, originalname, mimetype };
        return this.audioTrack;
      }
    } catch (error) {
      this.logger.warn('Failed to load slideshow audio track', error as Error);
    }

    this.audioTrack = null;
    return this.audioTrack;
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
