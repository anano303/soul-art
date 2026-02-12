import { Controller, Get, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import axios from 'axios';

/**
 * Media Proxy Controller
 *
 * Proxies images through our domain (api.soulart.ge) so that
 * TikTok's URL ownership verification passes.
 *
 * TikTok requires PULL_FROM_URL images to come from a verified domain.
 * Since our images are on Cloudinary, we proxy them through our API.
 *
 * URL format: /v1/media/img/<base64url-encoded-original-url>
 * This is path-based so TikTok domain verification works.
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
   */
  @Get('proxy/tiktokHlBF3iktVuBIuI1BVmRyzrsXFgBSmV5j.txt')
  getTikTokVerification(@Res() res: Response): void {
    res.setHeader('Content-Type', 'text/plain');
    res.send(
      'tiktok-developers-site-verification=HlBF3iktVuBIuI1BVmRyzrsXFgBSmV5j',
    );
  }

  /**
   * Path-based image proxy for TikTok
   * URL format: /v1/media/proxy/<base64url-encoded-url>
   * Matches verified TikTok URL prefix: https://api.soulart.ge/v1/media/proxy/
   */
  @Get('proxy/*')
  async proxyImage(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // NestJS wildcard params are in req.params['0']
      const base64Part =
        (req.params as any)['0'] ||
        (req.params as any)[0] ||
        '';

      this.logger.debug(
        `Proxy request - params: ${JSON.stringify(req.params)}, path: ${req.path}`,
      );

      // Skip TikTok verification file
      if (!base64Part || base64Part.startsWith('tiktok')) {
        return;
      }

      // Decode base64url to original URL
      const originalUrl = Buffer.from(base64Part, 'base64url').toString(
        'utf-8',
      );

      if (!originalUrl.startsWith('https://')) {
        res.status(400).json({ error: 'Invalid image URL' });
        return;
      }

      // Security: only allow whitelisted domains
      const parsedUrl = new URL(originalUrl);
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
      const response = await axios.get(originalUrl, {
        responseType: 'stream',
        timeout: 60000, // 60 second timeout for TikTok downloads
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
      // No redirect - serve directly
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // Pipe the image stream to response
      response.data.pipe(res);
    } catch (error: any) {
      this.logger.error(`Media proxy error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch media' });
    }
  }
}
