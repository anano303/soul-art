import { Controller, Get, Query, Res, Param, Logger } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';

/**
 * Media Proxy Controller
 *
 * Proxies images through our domain (api.soulart.ge) so that
 * TikTok's URL ownership verification passes.
 *
 * TikTok requires PULL_FROM_URL images to come from a verified domain.
 * Since our images are on Cloudinary, we proxy them through our API.
 */
@Controller('media')
export class MediaProxyController {
  private readonly logger = new Logger(MediaProxyController.name);

  // Allowed source domains for security
  private readonly allowedDomains = [
    'res.cloudinary.com',
    'cloudinary.com',
    'i.imgur.com',
    'soulart.ge',
  ];

  /**
   * TikTok domain verification endpoint
   * Serves the verification file for TikTok URL ownership
   */
  @Get('proxy/tiktokHlBF3iktVuBIuI1BVmRyzrsXFgBSmV5j.txt')
  getTikTokVerification(@Res() res: Response): void {
    res.setHeader('Content-Type', 'text/plain');
    res.send(
      'tiktok-developers-site-verification=HlBF3iktVuBIuI1BVmRyzrsXFgBSmV5j',
    );
  }

  @Get('proxy')
  async proxyImage(
    @Query('url') url: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (!url) {
        res.status(400).json({ error: 'URL parameter is required' });
        return;
      }

      // Decode URL if needed
      const decodedUrl = decodeURIComponent(url);

      // Security: only allow whitelisted domains
      const parsedUrl = new URL(decodedUrl);
      const isAllowed = this.allowedDomains.some(
        (domain) =>
          parsedUrl.hostname === domain ||
          parsedUrl.hostname.endsWith(`.${domain}`),
      );

      if (!isAllowed) {
        this.logger.warn(`Blocked proxy request for: ${parsedUrl.hostname}`);
        res.status(403).json({ error: 'Domain not allowed' });
        return;
      }

      // Fetch the image
      const response = await axios.get(decodedUrl, {
        responseType: 'stream',
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'SoulArt-MediaProxy/1.0',
        },
      });

      // Forward content type
      const contentType =
        response.headers['content-type'] || 'application/octet-stream';
      const contentLength = response.headers['content-length'];

      res.setHeader('Content-Type', contentType);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      // Cache for 1 hour
      res.setHeader('Cache-Control', 'public, max-age=3600');

      // Pipe the image stream to response
      response.data.pipe(res);
    } catch (error: any) {
      this.logger.error(`Media proxy error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch media' });
    }
  }
}
