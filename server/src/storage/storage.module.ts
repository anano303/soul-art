import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { CloudinaryModule } from '@/cloudinary/cloudinary.module';
import { AwsS3Module } from '@/aws-s3/aws-s3.module';

/**
 * StorageModule - გლობალური მოდული რომელიც StorageService-ს ხელმისაწვდომს ხდის
 * ყველა მოდულისთვის. არ არის საჭირო ცალ-ცალკე import-ი თითოეულ მოდულში.
 */
@Global()
@Module({
  imports: [CloudinaryModule, AwsS3Module],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
