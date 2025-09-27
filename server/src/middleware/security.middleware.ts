import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';

// Rate limiting configurations for different endpoint types
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        statusCode: 429,
        message: message || 'Too many requests from this IP, please try again later.',
        error: 'Too Many Requests'
      });
    }
  });
};

// Different rate limits for different operations
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // max 100 attempts per window
  'Too many authentication attempts from this IP, please try again after 15 minutes.'
);

// More lenient rate limit for token refresh operations
export const refreshRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  1000, // max 1000 refresh attempts per window (since tokens expire frequently)
  'Too many token refresh attempts from this IP, please try again later.'
);

// Rate limit for password reset operations (more restrictive)
export const passwordResetRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  50, // max 50 password reset attempts per hour
  'Too many password reset attempts from this IP, please try again after 1 hour.'
);

// Rate limit for device management operations
export const deviceManagementRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  300, // max 300 device operations per window
  'Too many device management requests from this IP, please try again later.'
);

export const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  2000, // max 2000 requests per window
  'Too many API requests from this IP, please try again later.'
);

export const uploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  500, // max 500 uploads per hour
  'Too many upload attempts from this IP, please try again after 1 hour.'
);

export const paymentRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  200, // max 200 payment attempts per hour
  'Too many payment attempts from this IP, please try again after 1 hour.'
);

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // Remove powered-by header
    res.removeHeader('X-Powered-By');
    
    next();
  }
}
