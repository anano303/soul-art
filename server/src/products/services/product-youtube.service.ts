import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YoutubeService, VideoUploadOptions } from '@/youtube/youtube.service';
import { ProductDocument } from '../schemas/product.schema';
import { UserDocument } from '@/users/schemas/user.schema';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import * as os from 'os';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import sharp from 'sharp';

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
    try {
      if (!this.isYoutubeConfigured()) {
        this.logger.warn('YouTube credentials missing. Skipping video upload.');
        return null;
      }

      let tempDir: string | null = null;
      let videoPath: string | null = null;

      try {
        tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'soulart-product-'));

        if (videoFile) {
          videoPath = await this.persistUploadedVideo(tempDir, videoFile);
        } else {
          videoPath = await this.generateSlideshowVideo(
            tempDir,
            imageFiles,
            product.name,
          );
        }

        if (!videoPath) {
          this.logger.warn('No video path generated for product upload.');
          return null;
        }

        const uploadOptions = this.buildVideoMetadata(product, user);
        const uploadResult = await this.youtubeService.uploadVideo(
          videoPath,
          uploadOptions,
        );

        return uploadResult;
      } finally {
        if (tempDir) {
          await this.safeRemoveDir(tempDir);
        }
      }
    } catch (error) {
      this.logger.error(
        'Failed to upload product video to YouTube',
        error as Error,
      );
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

  private async generateSlideshowVideo(
    tempDir: string,
    imageFiles: BackgroundUploadFile[],
    productName: string,
  ): Promise<string | null> {
    if (!imageFiles.length) {
      this.logger.warn('Cannot generate slideshow without images.');
      return null;
    }

    const limitedImages = imageFiles.slice(0, this.maxSlides);
    const framesDir = path.join(tempDir, 'frames');
    await fsp.mkdir(framesDir, { recursive: true });

    await Promise.all(
      limitedImages.map(async (file, index) => {
        const frameName = `frame-${String(index + 1).padStart(3, '0')}.jpg`;
        const framePath = path.join(framesDir, frameName);
        await sharp(file.buffer)
          .resize(1920, 1080, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          })
          .jpeg({ quality: 90 })
          .toFile(framePath);
      }),
    );

    const outputPath = path.join(tempDir, `${this.slugify(productName)}.mp4`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .addInput(path.join(framesDir, 'frame-%03d.jpg'))
        .inputOptions(['-framerate 1/5'])
        .videoFilters([
          'scale=1920:1080:force_original_aspect_ratio=decrease',
          'pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
        ])
        .outputOptions(['-c:v libx264', '-pix_fmt yuv420p', '-r 30'])
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath);
    });

    return outputPath;
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
}
