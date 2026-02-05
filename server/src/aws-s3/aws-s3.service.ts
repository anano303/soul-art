import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { BadRequestException, Injectable } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface UploadOptions {
  contentType?: string;
  acl?: ObjectCannedACL;
}

@Injectable()
export class AwsS3Service {
  private readonly bucketName: string;
  private readonly region: string;
  private readonly s3: S3Client;

  constructor() {
    this.bucketName = process.env.AWS_BUCKET_NAME || '';
    this.region = process.env.AWS_REGION || '';

    this.s3 = new S3Client({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      region: this.region || process.env.AWS_REGION,
    });
  }

  async uploadImage(
    filePath: string,
    file: Buffer,
    options: UploadOptions = {},
  ): Promise<string> {
    if (!filePath || !file) {
      throw new BadRequestException('filepath or file require');
    }

    const config: PutObjectCommandInput = {
      Key: filePath,
      Bucket: this.bucketName,
      Body: file,
    };

    if (options.contentType) {
      config.ContentType = options.contentType;
    }

    if (options.acl) {
      config.ACL = options.acl;
    }

    const uploadCommand = new PutObjectCommand(config);
    await this.s3.send(uploadCommand);
    return filePath;
  }

  getPublicUrl(key: string): string {
    if (!key) {
      return '';
    }

    const explicitBase = process.env.AWS_PUBLIC_BASE_URL;
    if (explicitBase) {
      return `${explicitBase.replace(/\/$/, '')}/${key}`;
    }

    if (this.bucketName && this.region) {
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    }

    if (this.bucketName) {
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    }

    return key;
  }

  async getImageByFileId(fileId: string) {
    if (!fileId) {
      return null;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileId,
      });

      return await getSignedUrl(this.s3, command, { expiresIn: 86400 });
    } catch (error) {
      console.error(`Error generating signed URL for ${fileId}:`, error);
      return null;
    }
  }

  async deleteImageByFileId(fileId: string) {
    if (!fileId) {
      throw new BadRequestException('file id required');
    }

    const config = {
      Key: fileId,
      Bucket: this.bucketName,
    };

    const deleteCommand = new DeleteObjectCommand(config);
    await this.s3.send(deleteCommand);

    return `image ${fileId} deleted`;
  }
}
