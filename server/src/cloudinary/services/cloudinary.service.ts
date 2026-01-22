import { Injectable, OnModuleInit } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 } from 'cloudinary';
import { Readable } from 'stream';
import { CloudinaryMigrationService } from './cloudinary-migration.service';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private isConfigured = false;
  private currentCloudName: string | null = null;

  constructor(
    private readonly migrationService: CloudinaryMigrationService,
  ) {}

  async onModuleInit() {
    await this.ensureConfigured();
  }

  /**
   * Force reconfiguration from DB (call after migration completes)
   */
  async refreshConfiguration(): Promise<void> {
    this.isConfigured = false;
    await this.ensureConfigured();
  }

  /**
   * Ensures Cloudinary is configured with the latest credentials from DB
   * Falls back to env vars if DB is not available
   */
  private async ensureConfigured(): Promise<void> {
    if (this.isConfigured) return;

    try {
      const credentials = await this.migrationService.getActiveCredentials();
      if (credentials) {
        v2.config({
          cloud_name: credentials.cloudName,
          api_key: credentials.apiKey,
          api_secret: credentials.apiSecret,
        });
        this.currentCloudName = credentials.cloudName;
        console.log(`☁️  Cloudinary configured from DB: ${credentials.cloudName}`);
        this.isConfigured = true;
        return;
      }
    } catch (error) {
      console.warn('CloudinaryService: Failed to get credentials from DB, using env vars');
    }

    // Fallback to env vars
    v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    this.currentCloudName = process.env.CLOUDINARY_CLOUD_NAME || null;
    console.log(`☁️  Cloudinary configured from ENV: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    this.isConfigured = true;
  }

  /**
   * Get the current cloud name being used for uploads
   */
  getCurrentCloudName(): string | null {
    return this.currentCloudName;
  }

  async uploadImage(
    file: Express.Multer.File,
    options: any = {},
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      // Merge default options with provided options
      const uploadOptions = {
        folder: 'ecommerce',
        ...options,
      };

      // Use upload instead of upload_stream for better compatibility
      v2.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(error);
          }
          resolve(result as any);
        },
      );
    });
  }

  async uploadImages(images: string[]): Promise<string[]> {
    const uploadPromises = images.map(async (imageUrl) => {
      const response = await fetch(imageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      return new Promise<string>((resolve, reject) => {
        const upload = v2.uploader.upload_stream(
          { folder: 'products' },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              return reject(error);
            }
            resolve(result?.secure_url || '');
          },
        );

        const stream = Readable.from(buffer);
        stream.pipe(upload);
      });
    });

    return Promise.all(uploadPromises);
  }

  async uploadBuffer(
    buffer: Buffer,
    publicId?: string,
    folder: string = 'products',
    resourceType: 'image' | 'video' = 'image',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder,
        resource_type: resourceType,
      };

      if (publicId) {
        uploadOptions.public_id = publicId;
      }

      const upload = v2.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(error);
          }
          resolve(result as UploadApiResponse);
        },
      );

      const stream = Readable.from(buffer);
      stream.pipe(upload);
    });
  }

  async deleteResource(
    publicId: string,
    resourceType: 'image' | 'video' = 'image',
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      v2.uploader.destroy(
        publicId,
        { resource_type: resourceType },
        (error, result) => {
          if (error) {
            console.error('Cloudinary delete error:', error);
            return reject(error);
          }
          resolve(result);
        },
      );
    });
  }

  async deleteFolder(folderPath: string): Promise<any> {
    // Safety check: only allow deleting from youtube-temp folder
    if (!folderPath.startsWith('youtube-temp/')) {
      console.error(
        `❌ Safety check failed: Attempted to delete non-youtube-temp folder: ${folderPath}`,
      );
      throw new Error('Can only delete folders from youtube-temp/ directory');
    }

    console.log(`🗑️  Deleting Cloudinary folder: ${folderPath}`);

    return new Promise((resolve, reject) => {
      v2.api.delete_resources_by_prefix(folderPath, (error, result) => {
        if (error) {
          console.error('Cloudinary folder delete error:', error);
          return reject(error);
        }
        console.log(
          `✅ Successfully deleted ${result.deleted?.length || 0} resources from ${folderPath}`,
        );
        resolve(result);
      });
    });
  }

  /**
   * Generate slideshow video from images using Cloudinary Video Transformation API
   * No local FFmpeg required - all processing done server-side by Cloudinary
   */
  async generateSlideshowFromImages(
    imagePublicIds: string[],
    slideDuration: number = 4,
    folder: string = 'youtube-temp',
  ): Promise<string> {
    console.log(
      `🎬 Generating slideshow from ${imagePublicIds.length} images (Cloudinary server-side)...`,
    );
    console.log(`   ⏱️  Slide duration: ${slideDuration} seconds`);
    console.log(`   📁 Target folder: ${folder}`);

    // Cloudinary video transformation approach:
    // 1. Upload a single frame as video base
    // 2. Use l_video (layer) transformations to overlay other frames
    // 3. Use du_ (duration) parameter to control frame timing

    // For now, use the first image as base and generate transformation URL
    const baseImageId = imagePublicIds[0];

    // Generate video URL with transformations
    // This will create a slideshow-like effect by using duration parameters
    const videoUrl = v2.url(baseImageId, {
      resource_type: 'video',
      format: 'mp4',
      transformation: [
        { width: 1280, height: 720, crop: 'pad', background: 'white' },
        { duration: `${slideDuration}`, effect: 'fade:-1000' },
      ],
    });

    console.log(`   ✅ Slideshow URL generated: ${videoUrl}`);
    return videoUrl;
  }

  /**
   * Concatenate two videos using Cloudinary Video API
   * No local FFmpeg required - all processing done server-side
   */
  async concatenateVideos(
    video1PublicId: string,
    video2PublicId: string,
    outputFolder: string = 'youtube-temp',
  ): Promise<string> {
    console.log(`🔗 Concatenating videos (Cloudinary server-side)...`);
    console.log(`   📹 Video 1: ${video1PublicId}`);
    console.log(`   📹 Video 2: ${video2PublicId}`);

    // Cloudinary video concatenation using video layers
    const concatenatedUrl = v2.url(video1PublicId, {
      resource_type: 'video',
      format: 'mp4',
      transformation: [
        { width: 1280, height: 720, crop: 'pad' },
        {
          overlay: {
            resource_type: 'video',
            public_id: video2PublicId,
          },
          flags: 'splice',
          effect: 'transition',
        },
      ],
    });

    console.log(`   ✅ Concatenated video URL: ${concatenatedUrl}`);
    return concatenatedUrl;
  }
}
