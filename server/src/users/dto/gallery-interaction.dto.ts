import { IsString, IsNotEmpty, MaxLength, IsUrl } from 'class-validator';

export class CreateGalleryCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500, { message: 'Comment cannot be longer than 500 characters' })
  comment: string;
}

export class GalleryLikeResponseDto {
  userId: string;
  artistId: string;
  imageUrl: string;
  createdAt: Date;
}

export class GalleryCommentResponseDto {
  id: string;
  userId: string;
  artistId: string;
  imageUrl: string;
  comment: string;
  createdAt: Date;
  user?: {
    name: string;
    storeName?: string;
  };
}

export class GalleryInteractionStatsDto {
  imageUrl: string;
  likesCount: number;
  commentsCount: number;
  isLikedByUser: boolean;
}