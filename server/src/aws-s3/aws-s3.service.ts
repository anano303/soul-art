import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BadRequestException, Injectable } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class AwsS3Service {
  private bucketName
  private s3
  constructor(){
    this.bucketName = process.env.AWS_BUCKET_NAME
    this.s3 = new S3Client({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      },
      region: process.env.AWS_REGION
    })
  }

  async uploadImage(filePath: string, file){
    if(!filePath || !file) throw new BadRequestException('filepath or file require')
    const config = {
      Key: filePath, 
      Bucket: this.bucketName,
      Body: file
    }
    const uploadCommand = new PutObjectCommand(config)
    await this.s3.send(uploadCommand)
    return filePath
  }

  async getImageByFileId(fileId: string){
    if(!fileId) return null
    
    try {
      // Instead of downloading the file and converting to base64,
      // generate a pre-signed URL that provides temporary access to the object
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileId,
      });
      
      // Generate a signed URL that expires in 24 hours (86400 seconds)
      const signedUrl = await getSignedUrl(this.s3, command, { expiresIn: 86400 });
      return signedUrl;
    } catch (error) {
      console.error(`Error generating signed URL for ${fileId}:`, error);
      return null;
    }
  }

  async deleteImageByFileId(fileId: string){
    if(!fileId) throw new BadRequestException('file id required')
    const config = {
      Key: fileId,
      Bucket: this.bucketName,
    }
    const deleteCommand = new DeleteObjectCommand(config)
    await this.s3.send(deleteCommand)
    
    return `image ${fileId} deleted`
  }
}
