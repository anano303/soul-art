import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

type RateLimiterInput = RateLimitOptions | RateLimitRequestHandler;

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private rateLimiter: RateLimitRequestHandler;

  constructor(private readonly input: RateLimiterInput) {
    // Check if input is already a rate limiter function or just options
    if (typeof input === 'function') {
      this.rateLimiter = input;
    } else {
      this.rateLimiter = rateLimit({
        windowMs: input.windowMs,
        max: input.max,
        standardHeaders: true,
        legacyHeaders: false,
      });
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    return new Observable((observer) => {
      this.rateLimiter(req, res, (err?: any) => {
        if (err) {
          observer.error(
            new HttpException(
              err.message || 'Too Many Requests',
              HttpStatus.TOO_MANY_REQUESTS,
            ),
          );
        } else {
          next.handle().subscribe(observer);
        }
      });
    });
  }
}

// Helper function to create rate limit interceptor instances
export const createRateLimitInterceptor = (input: RateLimiterInput) => {
  return new RateLimitInterceptor(input);
};
