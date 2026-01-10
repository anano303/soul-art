import { Injectable, OnModuleInit, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiOptions } from 'cloudinary';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';

import {
  CloudinaryConfig,
  CloudinaryConfigDocument,
  RetiredCloud,
  RetiredCloudDocument,
  CloudinaryMigration,
  CloudinaryMigrationDocument,
  MigrationStatus,
  MigratedFile,
  MigratedFileDocument,
} from '../schemas';

// Extension to MIME type mapping
const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  heic: 'image/heic',
  heif: 'image/heif',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mpeg: 'video/mpeg',
  webm: 'video/webm',
  pdf: 'application/pdf',
  zip: 'application/zip',
};

interface ExtractedCloudinaryPath {
  publicId: string;
  folder?: string;
  resourceType: string;
  version?: string;
  format?: string;
  filename: string;
  filenameWithoutExtension: string;
}

export interface MigrationProgress {
  migrationId: string;
  status: MigrationStatus;
  totalUrls: number;
  copiedUrls: number;
  failedUrls: number;
  skippedUrls: number;
  percentage: number;
  startedAt: Date;
  completedAt?: Date;
  recentErrors: { url: string; error: string }[];
}

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

@Injectable()
export class CloudinaryMigrationService implements OnModuleInit {
  private encryptionKey: Buffer;
  private encryptionIV: Buffer;
  
  // Cache for interceptor
  private cachedActiveCloud: string | null = null;
  private cachedRetiredClouds: string[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  // Migration control
  private shouldCancelMigration = false;
  private currentMigrationId: string | null = null;

  constructor(
    @InjectModel(CloudinaryConfig.name) private configModel: Model<CloudinaryConfigDocument>,
    @InjectModel(RetiredCloud.name) private retiredModel: Model<RetiredCloudDocument>,
    @InjectModel(CloudinaryMigration.name) private migrationModel: Model<CloudinaryMigrationDocument>,
    @InjectModel(MigratedFile.name) private migratedFileModel: Model<MigratedFileDocument>,
    @InjectConnection() private connection: Connection,
    private configService: ConfigService,
  ) {
    // Get encryption key from environment
    const key = this.configService.get<string>('CLOUDINARY_ENCRYPTION_KEY');
    if (!key) {
      console.warn('⚠️  CLOUDINARY_ENCRYPTION_KEY not set - using fallback (not secure for production)');
      // Fallback key for development - MUST be replaced in production
      this.encryptionKey = crypto.scryptSync('cloudinary-fallback-key-dev-only', 'salt', 32);
    } else {
      this.encryptionKey = crypto.scryptSync(key, 'cloudinary-salt', 32);
    }
    this.encryptionIV = Buffer.alloc(16, 0); // Fixed IV for simplicity - key should be unique per deployment
  }

  async onModuleInit() {
    // Seed initial config from environment if none exists
    await this.seedInitialConfig();
    
    // Initialize cache on startup
    await this.refreshCache();
    
    // Check for any in-progress migrations on startup (server restart scenario)
    const inProgress = await this.migrationModel.findOne({ status: MigrationStatus.InProgress });
    if (inProgress) {
      console.log(`⚠️  Found in-progress migration from ${inProgress.startedAt}. Will be resumed when requested.`);
    }
  }

  /**
   * Seed initial Cloudinary config from environment variables if none exists in DB
   */
  private async seedInitialConfig(): Promise<void> {
    const existingConfig = await this.configModel.findOne({ isActive: true });
    if (existingConfig) {
      console.log(`✅ Cloudinary config exists in DB: ${existingConfig.cloudName}`);
      return;
    }

    // Check if environment variables are set
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('⚠️  No Cloudinary config in DB and env vars are missing. Please configure via admin panel.');
      return;
    }

    // Create initial config from env
    await this.configModel.create({
      cloudName,
      apiKey,
      apiSecretEncrypted: this.encrypt(apiSecret),
      isActive: true,
    });

    // Also seed retired clouds based on hardcoded history
    const retiredCloudNames = ['dsufx8uzd', 'dwfqjtdu2'];
    for (let i = 0; i < retiredCloudNames.length; i++) {
      const name = retiredCloudNames[i];
      const exists = await this.retiredModel.findOne({ cloudName: name });
      if (!exists) {
        await this.retiredModel.create({
          cloudName: name,
          retiredAt: new Date(Date.now() - (retiredCloudNames.length - i) * 30 * 24 * 60 * 60 * 1000), // Approximate dates
          migratedToCloud: i < retiredCloudNames.length - 1 ? retiredCloudNames[i + 1] : cloudName,
        });
      }
    }

    console.log(`✅ Seeded Cloudinary config from env: ${cloudName} (retired: ${retiredCloudNames.join(', ')})`);
  }

  // ============================================
  // ENCRYPTION HELPERS
  // ============================================

  private encrypt(text: string): string {
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, this.encryptionIV);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decrypt(encryptedText: string): string {
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, this.encryptionIV);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // ============================================
  // CACHE MANAGEMENT (for interceptor)
  // ============================================

  async refreshCache(): Promise<void> {
    try {
      // Get active config
      const activeConfig = await this.configModel.findOne({ isActive: true });
      this.cachedActiveCloud = activeConfig?.cloudName || null;

      // Get retired clouds
      const retiredClouds = await this.retiredModel.find().sort({ retiredAt: 1 });
      this.cachedRetiredClouds = retiredClouds.map(r => r.cloudName);

      this.cacheExpiry = Date.now() + this.CACHE_TTL;
      console.log(`🔄 Cloudinary cache refreshed: active=${this.cachedActiveCloud}, retired=[${this.cachedRetiredClouds.join(', ')}]`);
    } catch (error) {
      console.error('Failed to refresh Cloudinary cache:', error);
    }
  }

  private async ensureCache(): Promise<void> {
    if (Date.now() > this.cacheExpiry) {
      await this.refreshCache();
    }
  }

  async getActiveCloudName(): Promise<string | null> {
    await this.ensureCache();
    return this.cachedActiveCloud;
  }

  async getRetiredCloudNames(): Promise<string[]> {
    await this.ensureCache();
    return this.cachedRetiredClouds || [];
  }

  // ============================================
  // CONFIGURATION MANAGEMENT
  // ============================================

  async getActiveConfig(): Promise<{ cloudName: string; apiKey: string; apiSecretMasked: string } | null> {
    const config = await this.configModel.findOne({ isActive: true });
    if (!config) return null;

    return {
      cloudName: config.cloudName,
      apiKey: config.apiKey,
      apiSecretMasked: '****' + this.decrypt(config.apiSecretEncrypted).slice(-4),
    };
  }

  async getRetiredClouds(): Promise<RetiredCloud[]> {
    return this.retiredModel.find().sort({ retiredAt: -1 });
  }

  async validateCredentials(credentials: CloudinaryCredentials): Promise<boolean> {
    try {
      // Configure Cloudinary with new credentials temporarily
      const testCloudinary = require('cloudinary').v2;
      testCloudinary.config({
        cloud_name: credentials.cloudName,
        api_key: credentials.apiKey,
        api_secret: credentials.apiSecret,
      });

      // Try to fetch usage to validate credentials
      await testCloudinary.api.usage();
      return true;
    } catch (error: any) {
      console.error('Credential validation failed:', error.message);
      return false;
    }
  }

  // ============================================
  // MIGRATION MANAGEMENT
  // ============================================

  async getActiveMigration(): Promise<CloudinaryMigrationDocument | null> {
    return this.migrationModel.findOne({ status: MigrationStatus.InProgress });
  }

  async getMigrationProgress(): Promise<MigrationProgress | null> {
    const migration = await this.migrationModel.findOne({ status: MigrationStatus.InProgress });
    if (!migration) return null;

    return {
      migrationId: migration._id.toString(),
      status: migration.status,
      totalUrls: migration.totalUrls,
      copiedUrls: migration.copiedUrls,
      failedUrls: migration.failedUrls,
      skippedUrls: migration.skippedUrls,
      percentage: migration.totalUrls > 0 
        ? Math.round(((migration.copiedUrls + migration.failedUrls + migration.skippedUrls) / migration.totalUrls) * 100) 
        : 0,
      startedAt: migration.startedAt,
      completedAt: migration.completedAt,
      recentErrors: migration.migrationErrors.slice(-5).map(e => ({ url: e.url, error: e.error })),
    };
  }

  async getMigrationHistory(): Promise<CloudinaryMigration[]> {
    return this.migrationModel
      .find({ status: { $ne: MigrationStatus.InProgress } })
      .sort({ startedAt: -1 })
      .limit(10);
  }

  async startMigration(credentials: CloudinaryCredentials): Promise<string> {
    // Check if there's already a migration in progress
    const existing = await this.getActiveMigration();
    if (existing) {
      throw new ConflictException('A migration is already in progress. Please wait or cancel it first.');
    }

    // Validate new credentials
    const valid = await this.validateCredentials(credentials);
    if (!valid) {
      throw new BadRequestException('Invalid Cloudinary credentials. Please check and try again.');
    }

    // Get current active config (to move to retired)
    const currentConfig = await this.configModel.findOne({ isActive: true });
    const retiredClouds = await this.retiredModel.find().sort({ retiredAt: 1 });
    const fromClouds = retiredClouds.map(r => r.cloudName);
    if (currentConfig) {
      fromClouds.push(currentConfig.cloudName);
    }

    // Create new migration record
    const migration = await this.migrationModel.create({
      fromClouds,
      toCloud: credentials.cloudName,
      status: MigrationStatus.InProgress,
      totalUrls: 0,
      copiedUrls: 0,
      failedUrls: 0,
      skippedUrls: 0,
      migrationErrors: [],
      startedAt: new Date(),
    });

    // Start migration in background
    this.currentMigrationId = migration._id.toString();
    this.shouldCancelMigration = false;
    this.runMigration(migration._id.toString(), credentials, currentConfig?.cloudName);

    return migration._id.toString();
  }

  async cancelMigration(): Promise<void> {
    const migration = await this.getActiveMigration();
    if (!migration) {
      throw new BadRequestException('No active migration to cancel.');
    }

    this.shouldCancelMigration = true;
    
    // Update status
    await this.migrationModel.updateOne(
      { _id: migration._id },
      { 
        status: MigrationStatus.Cancelled,
        cancelledAt: new Date(),
        cancelReason: 'Cancelled by user',
      }
    );

    this.currentMigrationId = null;
  }

  async continueMigration(): Promise<string> {
    // Look for cancelled or failed migration to continue
    const migration = await this.migrationModel.findOne({ 
      status: { $in: [MigrationStatus.Cancelled, MigrationStatus.Failed] } 
    }).sort({ startedAt: -1 });

    if (!migration) {
      throw new BadRequestException('No migration to continue.');
    }

    // Get credentials from the NEW config (if it was saved) or require them again
    const config = await this.configModel.findOne({ cloudName: migration.toCloud });
    if (!config) {
      throw new BadRequestException('Credentials for destination cloud not found. Please start a new migration.');
    }

    const credentials: CloudinaryCredentials = {
      cloudName: config.cloudName,
      apiKey: config.apiKey,
      apiSecret: this.decrypt(config.apiSecretEncrypted),
    };

    // Update status back to in progress
    await this.migrationModel.updateOne(
      { _id: migration._id },
      { 
        status: MigrationStatus.InProgress,
        cancelledAt: null,
        cancelReason: null,
      }
    );

    // Resume migration
    this.currentMigrationId = migration._id.toString();
    this.shouldCancelMigration = false;
    this.runMigration(migration._id.toString(), credentials, undefined, true);

    return migration._id.toString();
  }

  // ============================================
  // MIGRATION EXECUTION
  // ============================================

  private async runMigration(
    migrationId: string,
    credentials: CloudinaryCredentials,
    previousCloudName?: string,
    isResume = false,
  ): Promise<void> {
    console.log(`🚀 ${isResume ? 'Resuming' : 'Starting'} Cloudinary migration to ${credentials.cloudName}`);

    // Configure Cloudinary with new credentials
    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
    });

    const db = this.connection.db;
    if (!db) {
      await this.migrationModel.updateOne(
        { _id: migrationId },
        { status: MigrationStatus.Failed, completedAt: new Date() }
      );
      return;
    }

    try {
      // Get retired cloud names
      const retiredClouds = await this.retiredModel.find();
      const oldCloudNames = retiredClouds.map(r => r.cloudName);
      if (previousCloudName && !oldCloudNames.includes(previousCloudName)) {
        oldCloudNames.push(previousCloudName);
      }

      // Collect all URLs
      const allUrls = await this.getAllCloudinaryUrls(db as any, oldCloudNames);
      const urlArray = Array.from(allUrls);

      // Update total count
      await this.migrationModel.updateOne(
        { _id: migrationId },
        { totalUrls: urlArray.length }
      );

      console.log(`📊 Total URLs to migrate: ${urlArray.length}`);

      // Get already migrated files for this destination
      const migratedFiles = await this.migratedFileModel.find({ 
        destinationCloud: credentials.cloudName 
      }).select('publicId');
      const migratedSet = new Set(migratedFiles.map(f => f.publicId));

      let copiedUrls = 0;
      let failedUrls = 0;
      let skippedUrls = 0;

      // Process each URL
      for (let i = 0; i < urlArray.length; i++) {
        // Check for cancellation
        if (this.shouldCancelMigration) {
          console.log('🛑 Migration cancelled by user');
          return;
        }

        const url = urlArray[i];
        const result = await this.migrateImage(
          url,
          credentials,
          migrationId,
          oldCloudNames,
          migratedSet,
        );

        if (result === 'success') copiedUrls++;
        else if (result === 'skipped') skippedUrls++;
        else failedUrls++;

        // Update progress every 5 files
        if ((i + 1) % 5 === 0 || i === urlArray.length - 1) {
          await this.migrationModel.updateOne(
            { _id: migrationId },
            { copiedUrls, failedUrls, skippedUrls }
          );
        }

        // Log progress every 50 files
        if ((i + 1) % 50 === 0) {
          console.log(`📈 Progress: ${i + 1}/${urlArray.length} (${Math.round(((i + 1) / urlArray.length) * 100)}%)`);
        }
      }

      // Migration completed successfully
      await this.migrationModel.updateOne(
        { _id: migrationId },
        { 
          status: MigrationStatus.Completed,
          completedAt: new Date(),
          copiedUrls,
          failedUrls,
          skippedUrls,
        }
      );

      // Now update the config and retired clouds
      if (!isResume) {
        await this.finalizeMigration(credentials, previousCloudName);
      }

      console.log(`✅ Migration completed! Copied: ${copiedUrls}, Skipped: ${skippedUrls}, Failed: ${failedUrls}`);
    } catch (error) {
      console.error('❌ Migration failed:', error);
      await this.migrationModel.updateOne(
        { _id: migrationId },
        { status: MigrationStatus.Failed, completedAt: new Date() }
      );
    } finally {
      this.currentMigrationId = null;
    }
  }

  private async finalizeMigration(
    credentials: CloudinaryCredentials,
    previousCloudName?: string,
  ): Promise<void> {
    // Move current active config to retired
    if (previousCloudName) {
      await this.retiredModel.create({
        cloudName: previousCloudName,
        retiredAt: new Date(),
        migratedToCloud: credentials.cloudName,
      });
    }

    // Deactivate old config
    await this.configModel.updateMany({}, { isActive: false });

    // Create new active config
    await this.configModel.create({
      cloudName: credentials.cloudName,
      apiKey: credentials.apiKey,
      apiSecretEncrypted: this.encrypt(credentials.apiSecret),
      isActive: true,
    });

    // Refresh cache
    await this.refreshCache();

    console.log(`🔄 Config updated: ${previousCloudName} → ${credentials.cloudName} (retired list updated)`);
  }

  private async migrateImage(
    url: string,
    credentials: CloudinaryCredentials,
    migrationId: string,
    oldCloudNames: string[],
    migratedSet: Set<string>,
  ): Promise<'success' | 'skipped' | 'failed'> {
    try {
      const pathInfo = this.extractCloudinaryPath(url);
      const { publicId, folder, resourceType, format, filenameWithoutExtension } = pathInfo;

      // Check if already migrated
      if (migratedSet.has(publicId)) {
        return 'skipped';
      }

      // Build source URL from latest old cloud
      const latestOldCloud = oldCloudNames[oldCloudNames.length - 1];
      let sourceUrl = url;
      for (const oldName of oldCloudNames) {
        if (sourceUrl.includes(oldName)) {
          sourceUrl = sourceUrl.replace(oldName, latestOldCloud);
        }
      }

      // Download image
      const { buffer, contentType } = await this.downloadImage(sourceUrl, format);
      const dataUri = `data:${contentType};base64,${buffer.toString('base64')}`;

      // Upload to new account
      const uploadOptions: UploadApiOptions = {
        public_id: filenameWithoutExtension,
        resource_type: resourceType as any,
        overwrite: false,
        invalidate: false,
        unique_filename: false,
        use_filename: false,
        type: 'upload',
      };

      if (folder) {
        uploadOptions.folder = folder;
      }

      if (format) {
        uploadOptions.format = format;
      }

      await cloudinary.uploader.upload(dataUri, uploadOptions);

      // Track migrated file in DB
      await this.migratedFileModel.create({
        migrationId,
        publicId,
        destinationCloud: credentials.cloudName,
        sourceUrl: url,
        resourceType,
        migratedAt: new Date(),
      });

      migratedSet.add(publicId);
      return 'success';
    } catch (error: any) {
      // Log error to migration
      await this.migrationModel.updateOne(
        { _id: migrationId },
        {
          $push: {
            migrationErrors: {
              url,
              error: error.message || 'Unknown error',
              timestamp: new Date(),
            }
          }
        }
      );
      return 'failed';
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private extractCloudinaryPath(url: string): ExtractedCloudinaryPath {
    try {
      const urlObj = new URL(url);
      const segments = urlObj.pathname.split('/').filter(Boolean);

      const resourceTypeIndex = segments.findIndex((segment) =>
        ['image', 'video', 'raw'].includes(segment),
      );

      if (resourceTypeIndex === -1) {
        throw new Error('Invalid Cloudinary URL');
      }

      const resourceType = segments[resourceTypeIndex];
      const uploadSegments = segments.slice(resourceTypeIndex + 2);

      if (uploadSegments.length === 0) {
        throw new Error('Missing upload path segments');
      }

      const versionSegmentIndex = uploadSegments.findIndex((segment) =>
        /^v\d+$/.test(segment),
      );
      const version =
        versionSegmentIndex >= 0
          ? uploadSegments[versionSegmentIndex]
          : undefined;

      const pathSegments =
        versionSegmentIndex >= 0
          ? uploadSegments.slice(versionSegmentIndex + 1)
          : uploadSegments.filter(
              (segment, index) => index !== 0 || uploadSegments.length === 1,
            );

      if (pathSegments.length === 0) {
        throw new Error('Failed to determine public_id path');
      }

      const filename = pathSegments[pathSegments.length - 1];
      const formatMatch = filename.match(/\.([^.]+)$/);
      const format = formatMatch ? formatMatch[1].toLowerCase() : undefined;
      const filenameWithoutExtension = formatMatch
        ? filename.slice(0, -(formatMatch[1].length + 1))
        : filename;
      const folderSegments = pathSegments.slice(0, -1);
      const folder =
        folderSegments.length > 0 ? folderSegments.join('/') : undefined;
      const publicId = folder
        ? `${folder}/${filenameWithoutExtension}`
        : filenameWithoutExtension;

      return {
        publicId,
        folder,
        resourceType,
        version,
        format,
        filename,
        filenameWithoutExtension,
      };
    } catch (error) {
      console.error('Error parsing URL:', url, error);
      throw error;
    }
  }

  private async downloadImage(
    url: string,
    fallbackFormat?: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      protocol
        .get(url, (response) => {
          const statusCode = response.statusCode ?? 0;

          if ([301, 302, 307, 308].includes(statusCode)) {
            const nextLocation = response.headers.location;
            if (!nextLocation) {
              reject(new Error('Redirect encountered without location header'));
              return;
            }
            this.downloadImage(nextLocation, fallbackFormat)
              .then(resolve)
              .catch(reject);
            return;
          }

          if (statusCode !== 200) {
            reject(new Error(`Failed to download: ${statusCode}`));
            return;
          }

          const chunks: Buffer[] = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('error', reject);
          response.on('end', () => {
            const headerContentType = Array.isArray(
              response.headers['content-type'],
            )
              ? response.headers['content-type'][0]
              : response.headers['content-type'];
            const normalizedFormat = fallbackFormat
              ? fallbackFormat.toLowerCase()
              : undefined;
            const contentType =
              headerContentType ||
              (normalizedFormat
                ? EXTENSION_TO_MIME[normalizedFormat]
                : undefined) ||
              'application/octet-stream';

            resolve({
              buffer: Buffer.concat(chunks),
              contentType,
            });
          });
        })
        .on('error', reject);
    });
  }

  private async getAllCloudinaryUrls(db: any, oldCloudNames: string[]): Promise<Set<string>> {
    const urls = new Set<string>();

    const cloudRegexOr = (field: string) => ({ 
      $or: oldCloudNames.map(name => ({ [field]: { $regex: name } })) 
    });
    const hasOldCloud = (str: string) => str && oldCloudNames.some(name => str.includes(name));

    // Products - images array
    const products = await db.collection('products').find(cloudRegexOr('images')).toArray();
    for (const product of products) {
      if (product.images && Array.isArray(product.images)) {
        for (const img of product.images) {
          if (hasOldCloud(img)) urls.add(img);
        }
      }
      if (hasOldCloud(product.brandLogo)) urls.add(product.brandLogo);
    }

    // Products - thumbnail
    const productsWithThumbnail = await db.collection('products').find(cloudRegexOr('thumbnail')).toArray();
    for (const product of productsWithThumbnail) {
      if (product.thumbnail) urls.add(product.thumbnail);
    }

    // Banners
    const banners = await db.collection('banners').find(cloudRegexOr('imageUrl')).toArray();
    for (const banner of banners) {
      if (banner.imageUrl) urls.add(banner.imageUrl);
    }

    // Users
    const users = await db.collection('users').find({ 
      $or: [
        ...oldCloudNames.map(name => ({ profileImagePath: { $regex: name } })),
        ...oldCloudNames.map(name => ({ storeLogo: { $regex: name } })),
        ...oldCloudNames.map(name => ({ storeLogoPath: { $regex: name } })),
        ...oldCloudNames.map(name => ({ artistCoverImage: { $regex: name } })),
        ...oldCloudNames.map(name => ({ artistGallery: { $regex: name } })),
      ]
    }).toArray();

    for (const user of users) {
      if (hasOldCloud(user.profileImagePath)) urls.add(user.profileImagePath);
      if (hasOldCloud(user.storeLogo)) urls.add(user.storeLogo);
      if (hasOldCloud(user.storeLogoPath)) urls.add(user.storeLogoPath);
      if (hasOldCloud(user.artistCoverImage)) urls.add(user.artistCoverImage);
      if (user.artistGallery && Array.isArray(user.artistGallery)) {
        for (const img of user.artistGallery) {
          if (hasOldCloud(img)) urls.add(img);
        }
      }
    }

    // Blog posts
    const blogs = await db.collection('blogposts').find({ 
      $or: [
        ...oldCloudNames.map(name => ({ coverImage: { $regex: name } })),
        ...oldCloudNames.map(name => ({ images: { $regex: name } })),
      ]
    }).toArray();

    for (const blog of blogs) {
      if (hasOldCloud(blog.coverImage)) urls.add(blog.coverImage);
      if (blog.images && Array.isArray(blog.images)) {
        for (const img of blog.images) {
          if (hasOldCloud(img)) urls.add(img);
        }
      }
    }

    // Portfolio Posts
    const portfolioPosts = await db.collection('portfolioposts').find({ 
      $or: oldCloudNames.map(name => ({ 'images.url': { $regex: name } }))
    }).toArray();

    for (const post of portfolioPosts) {
      if (post.images && Array.isArray(post.images)) {
        for (const img of post.images) {
          if (img.url && hasOldCloud(img.url)) urls.add(img.url);
        }
      }
    }

    // Forums
    const forums = await db.collection('forums').find(cloudRegexOr('imagePath')).toArray();
    for (const forum of forums) {
      if (hasOldCloud(forum.imagePath)) urls.add(forum.imagePath);
    }

    // Categories
    const categories = await db.collection('categories').find(cloudRegexOr('image')).toArray();
    for (const category of categories) {
      if (category.image) urls.add(category.image);
    }

    return urls;
  }

  // ============================================
  // URL COUNT FOR PREVIEW
  // ============================================

  async getUrlsToMigrateCount(): Promise<number> {
    const db = this.connection.db;
    if (!db) return 0;

    const currentConfig = await this.configModel.findOne({ isActive: true });
    const retiredClouds = await this.retiredModel.find();
    
    const oldCloudNames = retiredClouds.map(r => r.cloudName);
    if (currentConfig) {
      oldCloudNames.push(currentConfig.cloudName);
    }

    if (oldCloudNames.length === 0) return 0;

    const urls = await this.getAllCloudinaryUrls(db as any, oldCloudNames);
    return urls.size;
  }
}
