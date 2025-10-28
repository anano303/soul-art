import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from '../services/app.service';
import { uploadRateLimit } from '@/middleware/security.middleware';
import { createRateLimitInterceptor } from '@/interceptors/rate-limit.interceptor';

@Controller('')
export class AppController {
  constructor(private appService: AppService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('image'))
  @UseInterceptors(createRateLimitInterceptor(uploadRateLimit))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const url = await this.appService.uploadImageToCloudinary(file);

    return {
      url,
    };
  }
}
