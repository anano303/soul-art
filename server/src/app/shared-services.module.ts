import { Module } from '@nestjs/common';
import { AppService } from './services/app.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  providers: [AppService],
  exports: [AppService],
})
export class SharedServicesModule {}
