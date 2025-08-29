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

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(private readonly rateLimit: any) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    return new Observable((observer) => {
      this.rateLimit(req, res, (err?: any) => {
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
export const createRateLimitInterceptor = (rateLimit: any) => {
  return new RateLimitInterceptor(rateLimit);
};
