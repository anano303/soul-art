import { Injectable } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    options: any = {}
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      // Merge default options with provided options
      const uploadOptions = {
        folder: 'ecommerce',
        ...options
      };

      // Use upload instead of upload_stream for better compatibility
      v2.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(error);
          }
          resolve(result as any);
        },
      );
    });
  }

  async uploadImages(images: string[]): Promise<string[]> {
    const uploadPromises = images.map(async (imageUrl) => {
      const response = await fetch(imageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      return new Promise<string>((resolve, reject) => {
        const upload = v2.uploader.upload_stream(
          { folder: 'products' },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              return reject(error);
            }
            resolve(result?.secure_url || '');
          },
        );

        const stream = Readable.from(buffer);
        stream.pipe(upload);
      });
    });

    return Promise.all(uploadPromises);
  }

  async uploadBuffer(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream(
        { folder: 'products' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(error);
          }
          resolve(result?.secure_url || '');
        },
      );

      const stream = Readable.from(buffer);
      stream.pipe(upload);
    });
  }
}
