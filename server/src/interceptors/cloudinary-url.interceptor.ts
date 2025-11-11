import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Cloudinary URL Interceptor
 *
 * Automatically replaces old Cloudinary account URLs with new account URLs
 * in all API responses without touching the database.
 *
 * Old account: dsufx8uzd
 * New account: dwfqjtdu2
 *
 * This allows gradual migration - we copy assets to new account first,
 * then swap URLs on the fly, and finally update database when ready.
 */
@Injectable()
export class CloudinaryUrlInterceptor implements NestInterceptor {
  private readonly OLD_CLOUD_NAME = 'dsufx8uzd';
  private readonly NEW_CLOUD_NAME = 'dwfqjtdu2';

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        return this.replaceCloudinaryUrls(data);
      }),
    );
  }

  /**
   * Recursively replaces Cloudinary URLs in any data structure
   * Uses WeakSet to track visited objects and prevent circular references
   */
  private replaceCloudinaryUrls(data: any, visited = new WeakSet()): any {
    if (!data) return data;

    // Handle strings first (most common case)
    if (typeof data === 'string' && data.includes('res.cloudinary.com')) {
      return data.replace(
        new RegExp(this.OLD_CLOUD_NAME, 'g'),
        this.NEW_CLOUD_NAME,
      );
    }

    // Handle primitive types
    if (typeof data !== 'object') {
      return data;
    }

    // Prevent circular references
    if (visited.has(data)) {
      return data;
    }
    visited.add(data);

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item) => this.replaceCloudinaryUrls(item, visited));
    }

    // Handle plain objects (skip Mongoose documents and class instances)
    if (data.constructor === Object || data.constructor.name === 'Object') {
      const result = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          result[key] = this.replaceCloudinaryUrls(data[key], visited);
        }
      }
      return result;
    }

    // For Mongoose documents and other complex objects, convert to plain object
    if (data.toJSON && typeof data.toJSON === 'function') {
      return this.replaceCloudinaryUrls(data.toJSON(), visited);
    }

    // Return as-is for other types
    return data;
  }
}
