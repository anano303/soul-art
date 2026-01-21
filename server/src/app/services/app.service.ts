import { BadRequestException, Injectable } from '@nestjs/common';
import { CloudinaryService } from 'src/cloudinary/services/cloudinary.service';

@Injectable()
export class AppService {
  constructor(private cloudinary: CloudinaryService) {}

  async uploadImageToCloudinary(file: Express.Multer.File) {
    // Check if it's HEIC/HEIF format and convert to JPEG
    const isHeic = file.mimetype === 'image/heic' || file.mimetype === 'image/heif' ||
                   file.originalname.toLowerCase().endsWith('.heic') ||
                   file.originalname.toLowerCase().endsWith('.heif');

    // Apply quality reduction and optimization during upload
    // This reduces file size and improves loading times
    let uploadOptions: any = {
      quality: 'auto:good', // Automatic quality optimization (good balance)
      fetch_format: 'auto', // Automatically choose best format (webp, avif, etc.)
      transformation: [
        {
          width: 2048, // Max width to prevent huge images
          height: 2048, // Max height
          crop: 'limit', // Only resize if larger, maintain aspect ratio
          quality: 'auto:good',
        },
      ],
    };

    if (isHeic) {
      // Convert HEIC to JPEG for web compatibility
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
    // Check if it's HEIC/HEIF format and convert to JPEG
    const isHeic = file.mimetype === 'image/heic' || file.mimetype === 'image/heif' ||
                   file.originalname.toLowerCase().endsWith('.heic') ||
                   file.originalname.toLowerCase().endsWith('.heif');

    // Apply quality reduction and optimization during upload for banners
    // Banners need higher quality but still should be optimized
    let uploadOptions: any = {
      quality: 'auto:best', // Higher quality for banners
      fetch_format: 'auto',
      transformation: [
        {
          width: 2560, // Max width for banners (larger than product images)
          height: 1440, // Max height
          crop: 'limit',
          quality: 'auto:best',
        },
      ],
    };

    if (isHeic) {
      // Convert HEIC to JPEG for web compatibility
      uploadOptions = {
        ...uploadOptions,
        format: 'jpg',
      };
    }

    const result = await this.cloudinary.uploadImage(file, uploadOptions).catch((err) => {
      console.log('Cloudinary banner upload error:', err);
      throw new BadRequestException('Invalid file type or upload failed.');
    });

    // For banners, use higher quality and larger size
    const optimizedUrl = result.secure_url.replace(
      '/upload/',
      '/upload/q_80,f_auto,w_1920/',
    );
    return optimizedUrl;
  }
}
