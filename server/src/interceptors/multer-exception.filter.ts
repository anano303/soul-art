import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { MulterError } from 'multer';
import { Response } from 'express';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Log detailed error information
    console.error('🚨 Multer Upload Error:', {
      code: exception.code,
      field: exception.field,
      message: exception.message,
      url: request.url,
      method: request.method,
      userId: request.user?.id || 'anonymous',
      contentType: request.headers['content-type'],
      contentLength: request.headers['content-length'],
    });

    let statusCode = 400;
    let message = 'File upload error';
    let details = '';

    switch (exception.code) {
      case 'LIMIT_UNEXPECTED_FILE':
        message = `Unexpected file field: "${exception.field}". Allowed fields: images, brandLogo, video`;
        details = `The form sent a file with field name "${exception.field}" which is not accepted. Please check your form configuration.`;
        break;
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        details =
          'Maximum file size is 10MB for images and 500MB for videos. Please reduce the file size and try again.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        details = 'Maximum 10 images, 1 logo, and 1 video allowed';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts';
        break;
      default:
        message = exception.message;
    }

    response.status(statusCode).json({
      statusCode,
      message,
      details,
      error: 'Bad Request',
      field: exception.field,
      code: exception.code,
    });
  }
}
