import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryProvider } from './services/cloudinary.provider';
import { CloudinaryService } from './services/cloudinary.service';
import { CloudinaryMigrationService } from './services/cloudinary-migration.service';
import { CloudinaryMigrationController } from './controllers/cloudinary-migration.controller';
import {
  CloudinaryConfig,
  CloudinaryConfigSchema,
  RetiredCloud,
  RetiredCloudSchema,
  CloudinaryMigration,
  CloudinaryMigrationSchema,
  MigratedFile,
  MigratedFileSchema,
} from './schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CloudinaryConfig.name, schema: CloudinaryConfigSchema },
      { name: RetiredCloud.name, schema: RetiredCloudSchema },
      { name: CloudinaryMigration.name, schema: CloudinaryMigrationSchema },
      { name: MigratedFile.name, schema: MigratedFileSchema },
    ]),
  ],
  controllers: [CloudinaryMigrationController],
  providers: [CloudinaryProvider, CloudinaryService, CloudinaryMigrationService],
  exports: [CloudinaryProvider, CloudinaryService, CloudinaryMigrationService],
})
export class CloudinaryModule {}
