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

    let uploadOptions: any = {};
    if (isHeic) {
      // Convert HEIC to JPEG for web compatibility
      uploadOptions = {
        format: 'jpg',
        quality: 'auto',
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

    let uploadOptions: any = {};
    if (isHeic) {
      // Convert HEIC to JPEG for web compatibility
      uploadOptions = {
        format: 'jpg',
        quality: 'auto',
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
