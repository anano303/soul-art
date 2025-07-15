import { Request } from 'express';

export interface FileFilterCallback {
  (error: Error | null, acceptFile: boolean): void;
}

export const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp|svg\+xml|bmp)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

// Add more utility functions as needed
export const formatFileName = (originalName: string): string => {
  const timestamp = new Date().getTime();
  const name = originalName.toLowerCase().replace(/\s+/g, '-');
  return `${timestamp}-${name}`;
};
