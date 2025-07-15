import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BannerService } from './services/banner.service';
import { BannerController } from './controllers/banner.controller';
import { Banner, BannerSchema } from './schemas/banner.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { SharedServicesModule } from '../app/shared-services.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Banner.name, schema: BannerSchema }]),
    CloudinaryModule,
    SharedServicesModule,
  ],
  controllers: [BannerController],
  providers: [BannerService],
  exports: [BannerService],
})
export class BannerModule {}
