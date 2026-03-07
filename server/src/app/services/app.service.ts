import { BadRequestException, Injectable } from '@nestjs/common';
import { CloudinaryService } from 'src/cloudinary/services/cloudinary.service';
import { StorageService } from '@/storage/storage.service';

@Injectable()
export class AppService {
  constructor(
    private cloudinary: CloudinaryService,
    private readonly storageService: StorageService,
  ) {}

  async uploadImageToCloudinary(file: Express.Multer.File) {
    // Check if it's HEIC/HEIF format and convert to JPEG
    const isHeic = file.mimetype === 'image/heic' || file.mimetype === 'image/heif' ||
                   file.originalname.toLowerCase().endsWith('.heic') ||
                   file.originalname.toLowerCase().endsWith('.heif');

    // If S3 is enabled, use StorageService (sharp optimization)
    if (this.storageService.isS3Enabled()) {
      try {
        const result = await this.storageService.uploadImage(file, {
          folder: 'ecommerce',
          format: isHeic ? 'jpeg' : 'webp',
          maxWidth: 1024,
          maxHeight: 1024,
        });
        return result.url;
      } catch (err) {
        console.log('S3 upload error:', err);
        throw new BadRequestException('Invalid file type or upload failed.');
      }
    }

    // Original Cloudinary upload with quality optimization and transformations
    let uploadOptions: any = {
      quality: 'auto:good',
      fetch_format: 'auto',
      transformation: [
        {
          width: 2048,
          height: 2048,
          crop: 'limit',
          quality: 'auto:good',
        },
      ],
    };

    if (isHeic) {
      uploadOptions = {
        ...uploadOptions,
        format: 'jpg',
      };
    }

    const result = await this.cloudinary.uploadImage(file, uploadOptions).catch((err) => {
      console.log('Cloudinary upload error:', err);
      throw new BadRequestException('Invalid file type or upload failed.');
    });

    const optimizedUrl = result.secure_url.replace(
      '/upload/',
      '/upload/q_auto,f_auto,w_1024/',
    );
    return optimizedUrl;
  }

  async uploadBannerImageToCloudinary(file: Express.Multer.File) {
    const isHeic = file.mimetype === 'image/heic' || file.mimetype === 'image/heif' ||
                   file.originalname.toLowerCase().endsWith('.heic') ||
                   file.originalname.toLowerCase().endsWith('.heif');

    // If S3 is enabled, use StorageService (sharp optimization)
    if (this.storageService.isS3Enabled()) {
      try {
        const result = await this.storageService.uploadImage(file, {
          folder: 'banners',
          format: isHeic ? 'jpeg' : 'webp',
          maxWidth: 1920,
          maxHeight: 1080,
        });
        return result.url;
      } catch (err) {
        console.log('S3 banner upload error:', err);
        throw new BadRequestException('Invalid file type or upload failed.');
      }
    }

    // Original Cloudinary upload with quality optimization for banners
    let uploadOptions: any = {
      quality: 'auto:best',
      fetch_format: 'auto',
      transformation: [
        {
          width: 2560,
          height: 1440,
          crop: 'limit',
          quality: 'auto:best',
        },
      ],
    };

    if (isHeic) {
      uploadOptions = {
        ...uploadOptions,
        format: 'jpg',
      };
    }

    const result = await this.cloudinary.uploadImage(file, uploadOptions).catch((err) => {
      console.log('Cloudinary banner upload error:', err);
      throw new BadRequestException('Invalid file type or upload failed.');
    });

    const optimizedUrl = result.secure_url.replace(
      '/upload/',
      '/upload/q_80,f_auto,w_1920/',
    );
    return optimizedUrl;
  }
}
