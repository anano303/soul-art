import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CloudinaryMigrationService } from '../cloudinary/services/cloudinary-migration.service';
import { ConfigService } from '@nestjs/config';

/**
 * Cloudinary URL Interceptor
 *
 * Automatically replaces old Cloudinary account URLs with new account URLs
 * in all API responses without touching the database.
 *
 * Reads configuration from the database:
 * - Active cloud name from cloudinary_config collection
 * - Retired cloud names from retired_clouds collection
 *
 * Falls back to hardcoded values if database is not available.
 */
@Injectable()
export class CloudinaryUrlInterceptor implements NestInterceptor {
  // Fallback values if DB is not available
  private readonly FALLBACK_OLD_CLOUD_NAMES = ['dsufx8uzd', 'dwfqjtdu2', 'dmvh7vwpu'];
  private readonly FALLBACK_NEW_CLOUD_NAME = 'dbzlwfzzj';

  // Cache for cloud names
  private cachedOldCloudNames: string[] | null = null;
  private cachedNewCloudName: string | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute

  // S3 URL-ების ცნობა (ეს URL-ები არ უნდა შეიცვალოს)
  private readonly S3_URL_PATTERNS = ['.s3.', 's3.amazonaws.com', 'soulart-s3'];

  constructor(
    @Optional()
    @Inject(CloudinaryMigrationService)
    private readonly migrationService?: CloudinaryMigrationService,
    @Optional()
    @Inject(ConfigService)
    private readonly configService?: ConfigService,
  ) {}

  private async ensureCache(): Promise<void> {
    if (Date.now() < this.cacheExpiry && this.cachedNewCloudName) {
      return; // Cache is still valid
    }

    if (this.migrationService) {
      try {
        const [activeCloud, retiredClouds] = await Promise.all([
          this.migrationService.getActiveCloudName(),
          this.migrationService.getRetiredCloudNames(),
        ]);

        if (activeCloud) {
          this.cachedNewCloudName = activeCloud;
          this.cachedOldCloudNames = retiredClouds;
          this.cacheExpiry = Date.now() + this.CACHE_TTL;
          return;
        }
      } catch (error) {
        console.warn('CloudinaryUrlInterceptor: Failed to fetch from DB, using fallback');
      }
    }

    // Use fallback values
    this.cachedNewCloudName = this.FALLBACK_NEW_CLOUD_NAME;
    this.cachedOldCloudNames = this.FALLBACK_OLD_CLOUD_NAMES;
    this.cacheExpiry = Date.now() + this.CACHE_TTL;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      switchMap(async (data) => {
        await this.ensureCache();
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

    const oldCloudNames = this.cachedOldCloudNames || this.FALLBACK_OLD_CLOUD_NAMES;
    const newCloudName = this.cachedNewCloudName || this.FALLBACK_NEW_CLOUD_NAME;

    // Handle strings first (most common case)
    if (typeof data === 'string') {
      // S3 URL-ები არ უნდა შეიცვალოს
      if (this.S3_URL_PATTERNS.some(pattern => data.includes(pattern))) {
        return data;
      }
      if (data.includes('res.cloudinary.com')) {
        let result = data;
        for (const oldName of oldCloudNames) {
          result = result.replace(new RegExp(oldName, 'g'), newCloudName);
        }
        return result;
      }
      return data;
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
