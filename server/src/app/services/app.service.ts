import { BadRequestException, Injectable } from '@nestjs/common';
import { CloudinaryService } from 'src/cloudinary/services/cloudinary.service';

@Injectable()
export class AppService {
  constructor(private cloudinary: CloudinaryService) {}

  async uploadImageToCloudinary(file: Express.Multer.File) {
    const result = await this.cloudinary.uploadImage(file).catch((err) => {
      console.log(err);
      throw new BadRequestException('Invalid file type.');
    });

    const optimizedUrl = result.secure_url.replace(
      '/upload/',
      '/upload/q_auto,f_auto,w_1024/',
    );
    return optimizedUrl;
  }

  async uploadBannerImageToCloudinary(file: Express.Multer.File) {
    const result = await this.cloudinary.uploadImage(file).catch((err) => {
      console.log(err);
      throw new BadRequestException('Invalid file type.');
    });

    // For banners, use higher quality and larger size
    const optimizedUrl = result.secure_url.replace(
      '/upload/',
      '/upload/q_80,f_auto,w_1920/',
    );
    return optimizedUrl;
  }
}
