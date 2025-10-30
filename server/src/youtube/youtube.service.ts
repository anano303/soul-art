import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, youtube_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

export interface VideoUploadOptions {
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string; // YouTube category ID (e.g., "22" for People & Blogs)
  privacyStatus?: 'public' | 'private' | 'unlisted';
}

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private oauth2Client: OAuth2Client;
  private youtube: youtube_v3.Youtube;

  constructor(private configService: ConfigService) {
    this.initializeOAuth();
  }

  /**
   * OAuth2 Client-ის ინიციალიზაცია
   */
  private initializeOAuth() {
    const clientId = this.configService.get<string>('YOUTUBE_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'YOUTUBE_CLIENT_SECRET',
    );
    const redirectUri = this.configService.get<string>('YOUTUBE_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      this.logger.warn('YouTube API credentials are not configured');
      return;
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );

    // Refresh Token-ის დატვირთვა
    const refreshToken = this.configService.get<string>(
      'YOUTUBE_REFRESH_TOKEN',
    );
    if (refreshToken) {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });
    }

    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });

    this.logger.log('YouTube API initialized successfully');
  }

  /**
   * Ensures OAuth client და youtube SDK მზადაა სანამ მოთხოვნას შევასრულებთ
   */
  private ensureYoutubeClient() {
    if (!this.oauth2Client || !this.youtube) {
      this.initializeOAuth();
    }

    if (!this.oauth2Client || !this.youtube) {
      this.logger.error(
        'YouTube API is not initialized. Check environment variables.',
      );
      throw new HttpException(
        'YouTube API credentials are not configured on the server',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Authorization URL-ის გენერირება
   * პირველადი ავტორიზაციისთვის
   */
  getAuthUrl(): string {
    this.ensureYoutubeClient();
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent screen to get refresh token
    });
  }

  /**
   * Authorization Code-ით Token-ის მიღება
   */
  async getTokenFromCode(code: string): Promise<any> {
    this.ensureYoutubeClient();
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      this.logger.log('Tokens received successfully');
      this.logger.log('Refresh Token:', tokens.refresh_token);

      return tokens;
    } catch (error) {
      this.logger.error('Error getting tokens:', error);
      throw new HttpException(
        'Failed to get authentication tokens',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * ვიდეოს ატვირთვა YouTube-ზე
   * @param filePath - ვიდეო ფაილის path
   * @param options - ვიდეოს metadata
   * @returns YouTube video URL
   */
  async uploadVideo(
    filePathOrUrl: string,
    options: VideoUploadOptions,
  ): Promise<{ videoId: string; videoUrl: string; embedUrl: string }> {
    try {
      this.ensureYoutubeClient();

      let filePath = filePathOrUrl;
      let isTemporaryFile = false;

      // Check if it's a URL (Cloudinary)
      if (
        filePathOrUrl.startsWith('http://') ||
        filePathOrUrl.startsWith('https://')
      ) {
        this.logger.log(`Downloading video from URL: ${filePathOrUrl}`);

        // Download to temp file
        const axios = require('axios');
        const path = require('path');
        const os = require('os');

        const tempDir = await require('fs').promises.mkdtemp(
          path.join(os.tmpdir(), 'youtube-upload-'),
        );
        filePath = path.join(tempDir, `video-${Date.now()}.mp4`);

        const response = await axios.get(filePathOrUrl, {
          responseType: 'stream',
          timeout: 300000, // 5 minutes
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
          writer.on('finish', () => resolve());
          writer.on('error', reject);
        });

        isTemporaryFile = true;
        this.logger.log(`Video downloaded to: ${filePath}`);
      }

      if (!fs.existsSync(filePath)) {
        throw new HttpException('Video file not found', HttpStatus.NOT_FOUND);
      }

      this.logger.log(`Starting upload for: ${options.title}`);

      const fileSize = fs.statSync(filePath).size;
      const fileSizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
      this.logger.log(`File size: ${fileSizeInMB} MB`);

      // ვიდეოს metadata
      const videoMetadata = {
        snippet: {
          title: options.title,
          description: options.description,
          tags: options.tags || [],
          categoryId: options.categoryId || '22', // Default: People & Blogs
        },
        status: {
          privacyStatus: options.privacyStatus || 'public',
          selfDeclaredMadeForKids: false,
        },
      };

      // ვიდეოს ატვირთვა
      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: videoMetadata,
        media: {
          body: fs.createReadStream(filePath),
        },
      });

      const videoId = response.data.id;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;

      this.logger.log(`Video uploaded successfully: ${videoUrl}`);

      // Cleanup temporary file
      if (isTemporaryFile) {
        try {
          await require('fs').promises.unlink(filePath);
          const tempDir = require('path').dirname(filePath);
          await require('fs').promises.rmdir(tempDir, { recursive: true });
          this.logger.log('Temporary file cleaned up');
        } catch (cleanupError) {
          this.logger.warn(
            `Failed to cleanup temporary file: ${cleanupError.message}`,
          );
        }
      }

      // Playlist-ში დამატება
      const playlistId = this.configService.get<string>('YOUTUBE_PLAYLIST_ID');
      if (playlistId) {
        await this.addVideoToPlaylist(videoId, playlistId);
      }

      return {
        videoId,
        videoUrl,
        embedUrl,
      };
    } catch (error) {
      this.logger.error('Error uploading video:', error);

      // Handle quota exceeded error specifically
      if (
        error.message?.includes('quota') ||
        error.message?.includes('exceeded')
      ) {
        this.logger.warn(
          'YouTube upload quota exceeded - this is normal and will reset daily',
        );
        throw new HttpException(
          'YouTube upload quota exceeded. Please try again tomorrow.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new HttpException(
        `Failed to upload video: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * ვიდეოს Playlist-ში დამატება
   */
  async addVideoToPlaylist(videoId: string, playlistId: string): Promise<void> {
    try {
      this.ensureYoutubeClient();
      await this.youtube.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId: playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: videoId,
            },
          },
        },
      });

      this.logger.log(`Video added to playlist: ${playlistId}`);
    } catch (error) {
      this.logger.error('Error adding video to playlist:', error);
      // არ ვიყენებთ throw-ს რომ არ გავშალოთ მთელი upload process
      // თუ playlist-ში დამატება ვერ მოხერხდა
    }
  }

  /**
   * Upload thumbnail image for a video
   * @param videoId - YouTube video ID
   * @param thumbnailUrl - URL of the thumbnail image (Cloudinary URL)
   */
  async setVideoThumbnail(
    videoId: string,
    thumbnailUrl: string,
  ): Promise<void> {
    try {
      this.ensureYoutubeClient();

      this.logger.log(
        `🖼️  Setting thumbnail for video ${videoId} from: ${thumbnailUrl}`,
      );

      // Download thumbnail from URL
      const axios = require('axios');
      const response = await axios.get(thumbnailUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      const thumbnailBuffer = Buffer.from(response.data);
      this.logger.log(
        `   ✅ Downloaded thumbnail (${thumbnailBuffer.length} bytes)`,
      );

      // Create temporary file for thumbnail
      const fs = require('fs');
      const fsp = require('fs').promises;
      const os = require('os');
      const tempDir = await fsp.mkdtemp(
        require('path').join(os.tmpdir(), 'youtube-thumbnail-'),
      );
      const thumbnailPath = require('path').join(tempDir, 'thumbnail.jpg');
      await fsp.writeFile(thumbnailPath, thumbnailBuffer);

      this.logger.log(`   📁 Saved to temp: ${thumbnailPath}`);

      // Upload thumbnail to YouTube
      await this.youtube.thumbnails.set({
        videoId: videoId,
        media: {
          body: fs.createReadStream(thumbnailPath),
        },
      });

      this.logger.log(`   ✅ Thumbnail uploaded successfully for ${videoId}`);

      // Cleanup temp file
      try {
        await fsp.unlink(thumbnailPath);
        await fsp.rmdir(tempDir, { recursive: true });
        this.logger.log(`   🧹 Temp thumbnail file cleaned up`);
      } catch (cleanupError) {
        this.logger.warn(
          `   ⚠️  Failed to cleanup thumbnail temp file: ${cleanupError.message}`,
        );
      }
    } catch (error) {
      this.logger.error('Error setting video thumbnail:', error);
      this.logger.warn(
        'Thumbnail upload failed, but video was uploaded successfully',
      );
      // Don't throw - thumbnail is optional, video is already uploaded
    }
  }

  /**
   * Playlist-ის შექმნა
   */
  async createPlaylist(
    title: string,
    description: string,
    privacyStatus: 'public' | 'private' | 'unlisted' = 'public',
  ): Promise<string> {
    try {
      this.ensureYoutubeClient();
      const response = await this.youtube.playlists.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description,
          },
          status: {
            privacyStatus,
          },
        },
      });

      const playlistId = response.data.id;
      this.logger.log(`Playlist created: ${playlistId}`);
      return playlistId;
    } catch (error) {
      this.logger.error('Error creating playlist:', error);
      throw new HttpException(
        'Failed to create playlist',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * არხის ინფორმაციის მიღება
   */
  async getChannelInfo(): Promise<any> {
    try {
      this.ensureYoutubeClient();
      const response = await this.youtube.channels.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        mine: true,
      });

      return response.data.items?.[0] || null;
    } catch (error) {
      this.logger.error('Error getting channel info:', error);
      throw new HttpException(
        'Failed to get channel info',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * ვიდეოს წაშლა
   */
  async deleteVideo(videoId: string): Promise<void> {
    try {
      this.ensureYoutubeClient();
      await this.youtube.videos.delete({
        id: videoId,
      });

      this.logger.log(`Video deleted: ${videoId}`);
    } catch (error) {
      this.logger.error('Error deleting video:', error);
      throw new HttpException(
        'Failed to delete video',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * ვიდეოს განახლება
   */
  async updateVideo(
    videoId: string,
    updates: Partial<VideoUploadOptions>,
  ): Promise<void> {
    try {
      this.ensureYoutubeClient();
      const updateData: any = {
        id: videoId,
      };

      if (updates.title || updates.description || updates.tags) {
        updateData.snippet = {};
        if (updates.title) updateData.snippet.title = updates.title;
        if (updates.description)
          updateData.snippet.description = updates.description;
        if (updates.tags) updateData.snippet.tags = updates.tags;
      }

      if (updates.privacyStatus) {
        updateData.status = {
          privacyStatus: updates.privacyStatus,
        };
      }

      await this.youtube.videos.update({
        part: ['snippet', 'status'],
        requestBody: updateData,
      });

      this.logger.log(`Video updated: ${videoId}`);
    } catch (error) {
      this.logger.error('Error updating video:', error);
      throw new HttpException(
        'Failed to update video',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
