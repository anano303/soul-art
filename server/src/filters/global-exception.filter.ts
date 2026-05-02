import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MulterError } from 'multer';
import { MulterExceptionFilter } from '../interceptors/multer-exception.filter';

/**
 * Logs every unhandled exception with a consistent [CRASH][HTTP] prefix
 * so DigitalOcean (or any) logs can be grepped to find what caused errors/restarts.
 * Delegates Multer errors to MulterExceptionFilter so response shape stays correct.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly multerFilter = new MulterExceptionFilter();

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof MulterError) {
      this.multerFilter.catch(exception, host);
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : exception instanceof Error
          ? exception.message
          : String(exception);

    const stack = exception instanceof Error ? exception.stack : undefined;

    // Suppress noisy 404s caused by browsers requesting static assets on API routes
    const isStaticAssetMiss =
      status === 404 && /\.(?:png|ico|jpg|jpeg|webp|svg|gif|js|css|map|txt|xml|json)$/.test(req.url);

    if (!isStaticAssetMiss) {
      this.logger.error(
        `[CRASH][HTTP] ${req.method} ${req.url} → ${status} ${message}` +
          (stack ? `\n${stack}` : ''),
      );
    }

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: 'Internal server error' };

    const payload =
      typeof body === 'object' ? body : { statusCode: status, message: body };
    res.status(status).json(payload);
  }
}
