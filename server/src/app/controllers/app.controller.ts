import {
  Controller,
  Post,
  Get,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from '../services/app.service';
import { uploadRateLimit } from '@/middleware/security.middleware';
import { createRateLimitInterceptor } from '@/interceptors/rate-limit.interceptor';
import { Response } from 'express';

@Controller('')
export class AppController {
  constructor(private appService: AppService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * TikTok domain verification - serves verification file at root
   */
  @Get('tiktokHlBF3iktVuBIuI1BVmRyzrsXFgBSmV5j.txt')
  getTikTokVerification(@Res() res: Response): void {
    res.setHeader('Content-Type', 'text/plain');
    res.send(
      'tiktok-developers-site-verification=HlBF3iktVuBIuI1BVmRyzrsXFgBSmV5j',
    );
  }

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
