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
      const result = await this.cloudinaryService.uploadImage(file);

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
      const result = await this.cloudinaryService.uploadImage(file);

      // Return the secure URL
      return result.secure_url;
    } catch (error) {
      console.error('Error uploading seller logo to Cloudinary:', error);
      throw error;
    }
  }
}
