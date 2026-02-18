import { Controller, Get, Headers, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('geo')
export class GeoController {
  @Get('test')
  testGeoHeader(
    @Headers('x-user-country') country: string,
    @Headers() headers: Record<string, string>,
    @Req() request: Request,
  ) {
    // Get client IP address
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.socket.remoteAddress ||
      'Unknown';

    return {
      success: true,
      receivedCountry: country || null,
      ipAddress,
      timestamp: new Date().toISOString(),
      receivedHeaders: {
        'x-user-country': headers['x-user-country'] || 'Not provided',
        'x-forwarded-for': headers['x-forwarded-for'] || 'Not provided',
        'x-real-ip': headers['x-real-ip'] || 'Not provided',
        'user-agent': headers['user-agent'] || 'Not provided',
      },
    };
  }
}
