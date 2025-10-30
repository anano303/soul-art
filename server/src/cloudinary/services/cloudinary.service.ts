import { Injectable } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    options: any = {},
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      // Merge default options with provided options
      const uploadOptions = {
        folder: 'ecommerce',
        ...options,
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

  async uploadBuffer(
    buffer: Buffer,
    publicId?: string,
    folder: string = 'products',
    resourceType: 'image' | 'video' = 'image',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder,
        resource_type: resourceType,
      };

      if (publicId) {
        uploadOptions.public_id = publicId;
      }

      const upload = v2.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(error);
          }
          resolve(result as UploadApiResponse);
        },
      );

      const stream = Readable.from(buffer);
      stream.pipe(upload);
    });
  }

  async deleteResource(
    publicId: string,
    resourceType: 'image' | 'video' = 'image',
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      v2.uploader.destroy(
        publicId,
        { resource_type: resourceType },
        (error, result) => {
          if (error) {
            console.error('Cloudinary delete error:', error);
            return reject(error);
          }
          resolve(result);
        },
      );
    });
  }

  async deleteFolder(folderPath: string): Promise<any> {
    // Safety check: only allow deleting from youtube-temp folder
    if (!folderPath.startsWith('youtube-temp/')) {
      console.error(
        `❌ Safety check failed: Attempted to delete non-youtube-temp folder: ${folderPath}`,
      );
      throw new Error('Can only delete folders from youtube-temp/ directory');
    }

    console.log(`🗑️  Deleting Cloudinary folder: ${folderPath}`);

    return new Promise((resolve, reject) => {
      v2.api.delete_resources_by_prefix(folderPath, (error, result) => {
        if (error) {
          console.error('Cloudinary folder delete error:', error);
          return reject(error);
        }
        console.log(
          `✅ Successfully deleted ${result.deleted?.length || 0} resources from ${folderPath}`,
        );
        resolve(result);
      });
    });
  }
}
