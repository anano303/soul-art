import { Injectable } from '@nestjs/common';
import { CloudinaryService } from '@/cloudinary/services/cloudinary.service';

@Injectable()
export class UserCloudinaryService {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  /**
   * Uploads a profile image to Cloudinary
   * @param file - Multer file with image data
   * @returns Promise with the Cloudinary upload response
   */
  async uploadProfileImage(file: Express.Multer.File): Promise<string> {
    try {
      const result = await this.cloudinaryService.uploadImage(file, {
        folder: 'artists/profiles',
      });

      // Return the secure URL
      return result.secure_url;
    } catch (error) {
      console.error('Error uploading profile image to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Uploads a seller logo to Cloudinary
   * @param file - Multer file with logo image data
   * @returns Promise with the Cloudinary upload response
   */
  async uploadSellerLogo(file: Express.Multer.File): Promise<string> {
    try {
      const result = await this.cloudinaryService.uploadImage(file, {
        folder: 'artists/logos',
      });

      // Return the secure URL
      return result.secure_url;
    } catch (error) {
      console.error('Error uploading seller logo to Cloudinary:', error);
      throw error;
    }
  }

  async uploadArtistCoverImage(file: Express.Multer.File): Promise<string> {
    try {
      const result = await this.cloudinaryService.uploadImage(file, {
        folder: 'artists/covers',
        transformation: [
          { width: 1920, height: 1080, crop: 'fill', gravity: 'auto' },
        ],
      });

      return result.secure_url;
    } catch (error) {
      console.error('Error uploading artist cover image to Cloudinary:', error);
      throw error;
    }
  }

  async uploadArtistGalleryImage(file: Express.Multer.File): Promise<string> {
    try {
      const result = await this.cloudinaryService.uploadImage(file, {
        folder: 'artists/gallery',
      });

      return result.secure_url;
    } catch (error) {
      console.error(
        'Error uploading artist gallery image to Cloudinary:',
        error,
      );
      throw error;
    }
  }
}
