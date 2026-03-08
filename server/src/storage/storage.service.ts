import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from '@/cloudinary/services/cloudinary.service';
import { AwsS3Service } from '@/aws-s3/aws-s3.service';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

/**
 * StorageService - აბსტრაქცია Cloudinary-სა და AWS S3-ს შორის.
 *
 * კონტროლდება ENV ცვლადით:
 *   AWS_ENABLED=true  → ახალი ატვირთვები S3-ზე მიდის
 *   AWS_ENABLED=false → ახალი ატვირთვები Cloudinary-ზე მიდის (default)
 *
 * პროდაქშენზე AWS_ENABLED=false რჩება სანამ მიგრაცია და ტესტირება არ დასრულდება.
 * ლოკალურად AWS_ENABLED=true დააყენე ტესტისთვის.
 */

export interface UploadResult {
  url: string;
  key?: string; // S3 key or Cloudinary public_id
  provider: 'cloudinary' | 's3';
}

@Injectable()
export class StorageService implements OnModuleInit {
  private useS3 = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  onModuleInit() {
    const awsEnabled = this.configService.get<string>('AWS_ENABLED');
    this.useS3 = awsEnabled === 'true';
    console.log(
      `📦 StorageService initialized: provider=${this.useS3 ? 'AWS S3' : 'Cloudinary'}`,
    );
  }

  /**
   * შემოწმება - S3 ჩართულია თუ არა
   */
  isS3Enabled(): boolean {
    return this.useS3;
  }

  /**
   * ფაილის ატვირთვა - ავტომატურად ირჩევს პროვაიდერს
   */
  async uploadImage(
    file: Express.Multer.File,
    options: {
      folder?: string;
      quality?: string;
      transformation?: any[];
      format?: string;
      fetch_format?: string;
      maxWidth?: number;
      maxHeight?: number;
    } = {},
  ): Promise<UploadResult> {
    if (this.useS3) {
      return this.uploadToS3(file, options.folder || 'ecommerce', {
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        format: options.format as any,
      });
    }
    return this.uploadToCloudinary(file, options);
  }

  /**
   * Buffer-ის ატვირთვა
   */
  async uploadBuffer(
    buffer: Buffer,
    options: {
      folder?: string;
      publicId?: string;
      resourceType?: 'image' | 'video';
      contentType?: string;
    } = {},
  ): Promise<UploadResult> {
    if (this.useS3) {
      return this.uploadBufferToS3(
        buffer,
        options.folder || 'ecommerce',
        options.contentType || 'image/jpeg',
        options.publicId,
      );
    }
    return this.uploadBufferToCloudinary(buffer, options);
  }

  /**
   * ფაილის წაშლა
   */
  async deleteFile(
    fileIdOrUrl: string,
    resourceType: 'image' | 'video' = 'image',
  ): Promise<void> {
    if (!fileIdOrUrl) return;

    // თუ S3 URL-ია
    if (this.isS3Url(fileIdOrUrl)) {
      const key = this.extractS3Key(fileIdOrUrl);
      if (key) {
        await this.awsS3Service.deleteImageByFileId(key);
      }
      return;
    }

    // თუ Cloudinary URL-ია ან public_id
    try {
      await this.cloudinaryService.deleteResource(fileIdOrUrl, resourceType);
    } catch (error) {
      console.warn(`Failed to delete from Cloudinary: ${fileIdOrUrl}`, error);
    }
  }

  /**
   * URL-ის შემოწმება - S3 URL არის თუ არა
   */
  isS3Url(url: string): boolean {
    if (!url) return false;
    const bucket = this.configService.get<string>('AWS_BUCKET_NAME') || '';
    return (
      url.includes('.s3.') ||
      url.includes('s3.amazonaws.com') ||
      (bucket && url.includes(bucket))
    );
  }

  /**
   * URL-ის შემოწმება - Cloudinary URL არის თუ არა
   */
  isCloudinaryUrl(url: string): boolean {
    if (!url) return false;
    return url.includes('res.cloudinary.com') || url.includes('cloudinary.com');
  }

  /**
   * S3 public URL-ის მიღება key-ით
   */
  getS3PublicUrl(key: string): string {
    return this.awsS3Service.getPublicUrl(key);
  }

  // ===== Private Methods =====

  /**
   * სურათის ოპტიმიზაცია sharp-ით S3-ზე ატვირთვამდე.
   * Cloudinary-ს q_auto,f_auto-ს ეკვივალენტი.
   * WebP ფორმატი - 30-50% უფრო პატარა ვიდრე JPEG იგივე ხარისხით.
   */
  private async optimizeImage(
    buffer: Buffer,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'webp' | 'jpeg' | 'png' | 'avif';
    } = {},
  ): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
    const maxWidth = options.maxWidth || 2048;
    const maxHeight = options.maxHeight || 2048;
    const quality = options.quality || 82;
    const format = options.format || 'webp';

    try {
      let pipeline = sharp(buffer, { failOn: 'none' })
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true, // არ გაადიდოს პატარა სურათი
        })
        .rotate(); // EXIF ორიენტაციის ავტომატური კორექცია

      let contentType: string;
      let extension: string;

      switch (format) {
        case 'avif':
          pipeline = pipeline.avif({ quality, effort: 4 });
          contentType = 'image/avif';
          extension = '.avif';
          break;
        case 'png':
          pipeline = pipeline.png({ quality, compressionLevel: 8 });
          contentType = 'image/png';
          extension = '.png';
          break;
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality, mozjpeg: true });
          contentType = 'image/jpeg';
          extension = '.jpg';
          break;
        case 'webp':
        default:
          pipeline = pipeline.webp({ quality, effort: 4 });
          contentType = 'image/webp';
          extension = '.webp';
          break;
      }

      const optimizedBuffer = await pipeline.toBuffer();

      // ლოგი ოპტიმიზაციის შედეგის
      const savings = (
        (1 - optimizedBuffer.length / buffer.length) *
        100
      ).toFixed(1);
      console.log(
        `🖼️ Image optimized: ${(buffer.length / 1024).toFixed(0)}KB → ${(optimizedBuffer.length / 1024).toFixed(0)}KB (${savings}% saved, ${format})`,
      );

      return { buffer: optimizedBuffer, contentType, extension };
    } catch (error) {
      console.warn(
        '⚠️ Image optimization failed, uploading original:',
        error.message,
      );
      // ოპტიმიზაცია თუ ვერ მოხერხდა, ორიგინალი აიტვირთოს
      return {
        buffer,
        contentType: 'image/jpeg',
        extension: path.extname('') || '.jpg',
      };
    }
  }

  private async uploadToS3(
    file: Express.Multer.File,
    folder: string,
    optimizeOptions?: {
      maxWidth?: number;
      maxHeight?: number;
      format?: 'webp' | 'jpeg' | 'png' | 'avif';
    },
  ): Promise<UploadResult> {
    // ოპტიმიზაცია sharp-ით ატვირთვამდე (Cloudinary q_auto,f_auto ეკვივალენტი)
    const { buffer, contentType, extension } = await this.optimizeImage(
      file.buffer,
      {
        maxWidth: optimizeOptions?.maxWidth || 2048,
        maxHeight: optimizeOptions?.maxHeight || 2048,
        quality: 82,
        format: optimizeOptions?.format || 'webp',
      },
    );

    const uniqueId = crypto.randomBytes(16).toString('hex');
    const key = `${folder}/${uniqueId}${extension}`;

    await this.awsS3Service.uploadImage(key, buffer, {
      contentType,
    });

    const url = this.awsS3Service.getPublicUrl(key);

    return {
      url,
      key,
      provider: 's3',
    };
  }

  private async uploadToCloudinary(
    file: Express.Multer.File,
    options: any,
  ): Promise<UploadResult> {
    // Pass through Cloudinary options (quality, fetch_format, transformation, etc.)
    const cloudinaryOptions: any = {};
    if (options.folder) cloudinaryOptions.folder = options.folder;
    if (options.quality) cloudinaryOptions.quality = options.quality;
    if (options.fetch_format)
      cloudinaryOptions.fetch_format = options.fetch_format;
    if (options.transformation)
      cloudinaryOptions.transformation = options.transformation;
    if (options.format) cloudinaryOptions.format = options.format;

    const result = await this.cloudinaryService.uploadImage(
      file,
      cloudinaryOptions,
    );

    return {
      url: result.secure_url,
      key: result.public_id,
      provider: 'cloudinary',
    };
  }

  private async uploadBufferToS3(
    buffer: Buffer,
    folder: string,
    contentType: string,
    publicId?: string,
  ): Promise<UploadResult> {
    // სურათების ოპტიმიზაცია (ვიდეო და სხვა ტიპები გამოტოვე)
    let finalBuffer = buffer;
    let finalContentType = contentType;
    let ext: string;

    if (contentType.startsWith('image/') && !contentType.includes('svg')) {
      const optimized = await this.optimizeImage(buffer, {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 82,
        format: 'webp',
      });
      finalBuffer = optimized.buffer;
      finalContentType = optimized.contentType;
      ext = optimized.extension;
    } else {
      ext = this.mimeToExtension(contentType);
    }

    const filename = publicId || crypto.randomBytes(16).toString('hex');
    const key = `${folder}/${filename}${ext}`;

    await this.awsS3Service.uploadImage(key, finalBuffer, {
      contentType: finalContentType,
    });

    const url = this.awsS3Service.getPublicUrl(key);

    return {
      url,
      key,
      provider: 's3',
    };
  }

  private async uploadBufferToCloudinary(
    buffer: Buffer,
    options: {
      folder?: string;
      publicId?: string;
      resourceType?: 'image' | 'video';
    },
  ): Promise<UploadResult> {
    const result = await this.cloudinaryService.uploadBuffer(
      buffer,
      options.publicId,
      options.folder || 'ecommerce',
      options.resourceType || 'image',
    );

    return {
      url: result.secure_url,
      key: result.public_id,
      provider: 'cloudinary',
    };
  }

  private extractS3Key(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Remove leading slash
      return urlObj.pathname.replace(/^\//, '');
    } catch {
      return url;
    }
  }

  private mimeToExtension(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'image/heic': '.jpg', // Convert HEIC to JPG
      'image/heif': '.jpg',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
    };
    return map[mime] || '.jpg';
  }
}
