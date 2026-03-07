import { Injectable } from '@nestjs/common';
import { CloudinaryService } from '@/cloudinary/services/cloudinary.service';
import { StorageService } from '@/storage/storage.service';

@Injectable()
export class UserCloudinaryService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Uploads a profile image
   * S3 → StorageService (sharp optimization), Cloudinary → direct upload
   */
  async uploadProfileImage(file: Express.Multer.File): Promise<string> {
    try {
      if (this.storageService.isS3Enabled()) {
        const result = await this.storageService.uploadImage(file, {
          folder: 'artists/profiles',
          maxWidth: 512,
          maxHeight: 512,
        });
        return result.url;
      }

      const result = await this.cloudinaryService.uploadImage(file, {
        folder: 'artists/profiles',
      });
      return result.secure_url;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw error;
    }
  }

  /**
   * Uploads a seller logo
   */
  async uploadSellerLogo(file: Express.Multer.File): Promise<string> {
    try {
      if (this.storageService.isS3Enabled()) {
        const result = await this.storageService.uploadImage(file, {
          folder: 'artists/logos',
          maxWidth: 400,
          maxHeight: 400,
        });
        return result.url;
      }

      const result = await this.cloudinaryService.uploadImage(file, {
        folder: 'artists/logos',
      });
      return result.secure_url;
    } catch (error) {
      console.error('Error uploading seller logo:', error);
      throw error;
    }
  }

  /**
   * Uploads artist cover image
   */
  async uploadArtistCoverImage(file: Express.Multer.File): Promise<string> {
    try {
      if (this.storageService.isS3Enabled()) {
        const result = await this.storageService.uploadImage(file, {
          folder: 'artists/covers',
          maxWidth: 1920,
          maxHeight: 1080,
        });
        return result.url;
      }

      const result = await this.cloudinaryService.uploadImage(file, {
        folder: 'artists/covers',
        transformation: [
          { width: 1920, height: 1080, crop: 'fill', gravity: 'auto' },
        ],
      });
      return result.secure_url;
    } catch (error) {
      console.error('Error uploading artist cover image:', error);
      throw error;
    }
  }

  /**
   * Uploads artist gallery image
   */
  async uploadArtistGalleryImage(file: Express.Multer.File): Promise<string> {
    try {
      if (this.storageService.isS3Enabled()) {
        const result = await this.storageService.uploadImage(file, {
          folder: 'artists/gallery',
          maxWidth: 1200,
          maxHeight: 1200,
        });
        return result.url;
      }

      const result = await this.cloudinaryService.uploadImage(file, {
        folder: 'artists/gallery',
      });
      return result.secure_url;
    } catch (error) {
      console.error('Error uploading artist gallery image:', error);
      throw error;
    }
  }
}
