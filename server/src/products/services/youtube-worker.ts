import { YoutubeService } from '../../youtube/youtube.service';
import { ConfigService } from '@nestjs/config';
import { ProductDocument } from '../schemas/product.schema';
import { UserDocument } from '../../users/schemas/user.schema';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import * as os from 'os';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import sharp from 'sharp';
import axios from 'axios';

interface BackgroundUploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

interface WorkerMessage {
  type: 'process_video';
  product: ProductDocument;
  user: UserDocument;
  videoFile?: BackgroundUploadFile | null;
  imageFiles: BackgroundUploadFile[];
  tempDir: string;
}

interface WorkerResponse {
  success: boolean;
  result?: any;
  error?: string;
}

// Configure ffmpeg paths
if (ffmpegInstaller?.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}
if (ffprobeInstaller?.path) {
  ffmpeg.setFfprobePath(ffprobeInstaller.path);
}

class YoutubeWorker {
  private youtubeService: YoutubeService;
  private readonly maxSlides = 50;

  constructor() {
    // Create a minimal config service for the worker
    const configService = {
      get: (key: string) => process.env[key],
    } as any;

    // Initialize YouTube service with worker's config
    this.youtubeService = new YoutubeService(configService);
  }

  async processMessage(message: WorkerMessage): Promise<WorkerResponse> {
    try {
      switch (message.type) {
        case 'process_video':
          const result = await this.handleProductVideoUpload(message);
          return { success: true, result };
        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Worker error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async handleProductVideoUpload({
    product,
    user,
    videoFile,
    imageFiles,
    tempDir,
  }: WorkerMessage & { type: 'process_video' }): Promise<any> {
    console.log(
      '🎬 Worker: Processing YouTube video for product:',
      product._id,
    );

    let videoPath: string | null = null;

    try {
      const workingImageFiles =
        imageFiles && imageFiles.length
          ? imageFiles
          : await this.fetchImagesFromProduct(product);

      if (videoFile) {
        videoPath = await this.persistUploadedVideo(tempDir, videoFile);
      } else {
        videoPath = await this.generateSlideshowVideo(
          tempDir,
          workingImageFiles,
          product?.name ?? 'SoulArt Product',
        );
      }

      if (!videoPath) {
        throw new Error('No video path generated for product upload');
      }

      const uploadOptions = this.buildVideoMetadata(product, user);
      const uploadResult = await this.youtubeService.uploadVideo(
        videoPath,
        uploadOptions,
      );

      return uploadResult;
    } catch (error) {
      console.error('Worker: Failed to upload product video to YouTube', error);
      throw error;
    } finally {
      // Cleanup will be handled by parent process
    }
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

    console.log(
      `Worker: Fetching ${validUrls.length} product images for slideshow`,
    );

    const results: BackgroundUploadFile[] = [];

    for (const url of validUrls) {
      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });

        results.push({
          buffer: Buffer.from(response.data),
          originalname: path.basename(url),
          mimetype: response.headers['content-type'] || 'image/jpeg',
        });
      } catch (error) {
        console.warn(`Worker: Failed to fetch image ${url}:`, error);
      }
    }

    return results;
  }

  private async persistUploadedVideo(
    tempDir: string,
    videoFile: BackgroundUploadFile,
  ): Promise<string> {
    const videoPath = path.join(tempDir, `uploaded-${Date.now()}.mp4`);
    await fsp.writeFile(videoPath, Buffer.from(videoFile.buffer));
    return videoPath;
  }

  private async generateSlideshowVideo(
    tempDir: string,
    imageFiles: BackgroundUploadFile[],
    productName: string,
  ): Promise<string | null> {
    if (!imageFiles.length) {
      console.warn('Worker: Cannot generate slideshow without images');
      return null;
    }

    const slideDuration = 5; // Default 5 seconds
    const maxImageCount = this.maxSlides;
    const limitedImages = imageFiles.slice(0, Math.max(maxImageCount, 0));
    const slides: BackgroundUploadFile[] = [...limitedImages];

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
          .jpeg({ quality: 85 })
          .toFile(framePath);

        // Clear buffer to free memory
        file.buffer = Buffer.alloc(0);
      } catch (error) {
        console.error(`Worker: Failed to process slide ${index + 1}:`, error);
        throw error;
      }
    }

    const outputPath = path.join(tempDir, `${this.slugify(productName)}.mp4`);

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg()
        .addInput(path.join(framesDir, 'frame-%03d.jpg'))
        .inputOptions([`-framerate 1/${slideDuration}`])
        .videoFilters([
          'scale=1920:1080:force_original_aspect_ratio=decrease',
          'pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
        ])
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-r 30',
          '-preset ultrafast', // Faster encoding, less CPU intensive
          '-crf 28', // Lower quality to reduce CPU/memory usage
          '-an', // No audio
        ])
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath);
    });

    return outputPath;
  }

  private buildVideoMetadata(product: ProductDocument, user: UserDocument) {
    const title = `${product.name} - SoulArt`;
    const description = product.description
      ? `${product.description}\n\nCreated by ${user.name || user.email} on SoulArt`
      : `Beautiful artwork by ${user.name || user.email} on SoulArt`;

    return {
      title: title.substring(0, 100),
      description: description.substring(0, 5000),
      tags: [
        'SoulArt',
        'artwork',
        'digital art',
        'creative',
        product.name,
      ].slice(0, 15),
      privacyStatus: 'public' as const,
    };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

// Worker process logic
const worker = new YoutubeWorker();

process.on('message', async (message: WorkerMessage) => {
  console.log('🎬 YouTube Worker received message:', message.type);
  try {
    const response = await worker.processMessage(message);
    console.log('🎬 YouTube Worker completed successfully');
    if (process.send) {
      process.send(response);
    }
  } catch (error) {
    console.error('🎬 YouTube Worker: Unhandled error:', error);
    if (process.send) {
      process.send({
        success: false,
        error: error instanceof Error ? error.message : 'Worker crashed',
      });
    }
  }
});

process.on('uncaughtException', (error) => {
  console.error('🎬 YouTube Worker: Uncaught exception:', error);
  if (process.send) {
    process.send({
      success: false,
      error: 'Worker crashed with uncaught exception',
    });
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(
    '🎬 YouTube Worker: Unhandled rejection at:',
    promise,
    'reason:',
    reason,
  );
  if (process.send) {
    process.send({
      success: false,
      error: 'Worker crashed with unhandled rejection',
    });
  }
  process.exit(1);
});

console.log('🎬 YouTube Worker started and ready');
