import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Query,
  Res,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { YoutubeService, VideoUploadOptions } from './youtube.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('youtube')
@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  /**
   * OAuth ავტორიზაციის URL-ის მიღება
   * პირველადი setup-ისთვის
   */
  @Get('auth')
  @ApiOperation({ summary: 'Get YouTube OAuth authorization URL' })
  getAuthUrl() {
    const authUrl = this.youtubeService.getAuthUrl();
    return {
      authUrl,
      message: 'Visit this URL to authorize the application',
    };
  }

  /**
   * OAuth Callback
   * Google-ისგან redirect-ის შემდეგ
   */
  @Get('oauth2callback')
  @ApiOperation({ summary: 'OAuth2 callback endpoint' })
  async oauth2callback(
    @Query('code') code: string,
    @Res() res: Response,
  ) {
    try {
      if (!code) {
        throw new HttpException(
          'Authorization code is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const tokens = await this.youtubeService.getTokenFromCode(code);

      // წარმატების შემთხვევაში გადამისამართება
      return res.send(`
        <html>
          <body>
            <h2>✅ Authorization Successful!</h2>
            <p>Refresh Token: <code>${tokens.refresh_token}</code></p>
            <p>Please copy the refresh token above and add it to your .env file:</p>
            <pre>YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}</pre>
            <p>You can close this window now.</p>
          </body>
        </html>
      `);
    } catch (error) {
      return res.status(500).send(`
        <html>
          <body>
            <h2>❌ Authorization Failed</h2>
            <p>Error: ${error.message}</p>
          </body>
        </html>
      `);
    }
  }

  /**
   * ვიდეოს ატვირთვა YouTube-ზე
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: './uploads/videos',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `video-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'video/x-msvideo',
          'video/x-flv',
          'video/x-ms-wmv',
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new HttpException(
              'Only video files are allowed',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload video to YouTube' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        video: {
          type: 'string',
          format: 'binary',
        },
        title: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        tags: {
          type: 'string',
          description: 'Comma-separated tags',
        },
        privacyStatus: {
          type: 'string',
          enum: ['public', 'private', 'unlisted'],
          default: 'public',
        },
      },
    },
  })
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      title: string;
      description: string;
      tags?: string;
      privacyStatus?: 'public' | 'private' | 'unlisted';
    },
  ) {
    if (!file) {
      throw new HttpException('Video file is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const options: VideoUploadOptions = {
        title: body.title,
        description: body.description,
        tags: body.tags ? body.tags.split(',').map(tag => tag.trim()) : [],
        privacyStatus: body.privacyStatus || 'public',
      };

      const result = await this.youtubeService.uploadVideo(file.path, options);

      // ფაილის წაშლა upload-ის შემდეგ
      fs.unlinkSync(file.path);

      return {
        success: true,
        message: 'Video uploaded successfully',
        ...result,
      };
    } catch (error) {
      // წაშლის მცდელობა error-ის შემთხვევაშიც
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  /**
   * ვიდეოს წაშლა
   */
  @Delete('video/:videoId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete video from YouTube' })
  async deleteVideo(@Param('videoId') videoId: string) {
    await this.youtubeService.deleteVideo(videoId);
    return {
      success: true,
      message: 'Video deleted successfully',
    };
  }

  /**
   * Playlist-ის შექმნა
   */
  @Post('playlist')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new playlist' })
  async createPlaylist(
    @Body()
    body: {
      title: string;
      description: string;
      privacyStatus?: 'public' | 'private' | 'unlisted';
    },
  ) {
    const playlistId = await this.youtubeService.createPlaylist(
      body.title,
      body.description,
      body.privacyStatus || 'public',
    );

    return {
      success: true,
      message: 'Playlist created successfully',
      playlistId,
      playlistUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
    };
  }

  /**
   * არხის ინფორმაცია
   */
  @Get('channel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get YouTube channel information' })
  async getChannelInfo() {
    const channelInfo = await this.youtubeService.getChannelInfo();
    return {
      success: true,
      channel: channelInfo,
    };
  }
}
