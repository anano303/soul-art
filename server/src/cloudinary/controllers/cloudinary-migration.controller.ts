import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '../../types/role.enum';
import { CloudinaryMigrationService, MigrationProgress, CloudinaryCredentials } from '../services/cloudinary-migration.service';
import { StartMigrationDto } from '../dtos';

@Controller('admin/cloudinary')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class CloudinaryMigrationController {
  constructor(private readonly migrationService: CloudinaryMigrationService) {}

  /**
   * Get current Cloudinary configuration (masked secret)
   */
  @Get('config')
  async getConfig() {
    const config = await this.migrationService.getActiveConfig();
    const retiredClouds = await this.migrationService.getRetiredClouds();
    const urlsToMigrate = await this.migrationService.getUrlsToMigrateCount();

    return {
      activeConfig: config,
      retiredClouds,
      urlsToMigrate,
    };
  }

  /**
   * Get migration progress (for polling)
   */
  @Get('migration/progress')
  async getMigrationProgress(): Promise<{ inProgress: boolean; progress: MigrationProgress | null }> {
    const progress = await this.migrationService.getMigrationProgress();
    return {
      inProgress: progress !== null,
      progress,
    };
  }

  /**
   * Get migration history
   */
  @Get('migration/history')
  async getMigrationHistory() {
    return this.migrationService.getMigrationHistory();
  }

  /**
   * Validate Cloudinary credentials without starting migration
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateCredentials(@Body() dto: StartMigrationDto): Promise<{ valid: boolean }> {
    const credentials: CloudinaryCredentials = {
      cloudName: dto.cloudName,
      apiKey: dto.apiKey,
      apiSecret: dto.apiSecret,
    };

    const valid = await this.migrationService.validateCredentials(credentials);
    return { valid };
  }

  /**
   * Start a new migration
   */
  @Post('migration/start')
  async startMigration(@Body() dto: StartMigrationDto): Promise<{ migrationId: string; message: string }> {
    const credentials: CloudinaryCredentials = {
      cloudName: dto.cloudName,
      apiKey: dto.apiKey,
      apiSecret: dto.apiSecret,
    };

    const migrationId = await this.migrationService.startMigration(credentials);
    return {
      migrationId,
      message: 'Migration started successfully. Poll /migration/progress for updates.',
    };
  }

  /**
   * Cancel active migration
   */
  @Post('migration/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelMigration(): Promise<{ message: string }> {
    await this.migrationService.cancelMigration();
    return { message: 'Migration cancelled successfully.' };
  }

  /**
   * Continue a cancelled/failed migration
   */
  @Post('migration/continue')
  async continueMigration(): Promise<{ migrationId: string; message: string }> {
    const migrationId = await this.migrationService.continueMigration();
    return {
      migrationId,
      message: 'Migration resumed successfully. Poll /migration/progress for updates.',
    };
  }
}
