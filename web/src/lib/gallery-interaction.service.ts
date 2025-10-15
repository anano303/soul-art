import { apiClient } from '@/lib/axios';

export interface GalleryInteractionStats {
  imageUrl: string;
  likesCount: number;
  commentsCount: number;
  isLikedByUser: boolean;
}

export interface GalleryComment {
  id: string;
  userId: string;
  artistId: string;
  imageUrl: string;
  comment: string;
  createdAt: string;
  user?: {
    name: string;
    storeName?: string;
  };
}

export interface GalleryCommentsResponse {
  comments: GalleryComment[];
  total: number;
}

export class GalleryInteractionService {

  async toggleLike(artistId: string, imageUrl: string): Promise<{ isLiked: boolean; likesCount: number }> {
    const encodedImageUrl = encodeURIComponent(imageUrl);
    
    try {
      const response = await apiClient.post(`/gallery/${artistId}/${encodedImageUrl}/like`);
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; statusText?: string; data?: unknown } };
      console.error('Like toggle failed:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        error: axiosError.response?.data,
        url: `/gallery/${artistId}/${encodedImageUrl}/like`
      });
      throw new Error(`Failed to toggle like: ${axiosError.response?.status || 'Unknown error'}`);
    }
  }

  async addComment(artistId: string, imageUrl: string, comment: string): Promise<GalleryComment> {
    const encodedImageUrl = encodeURIComponent(imageUrl);
    
    try {
      const response = await apiClient.post(`/gallery/${artistId}/${encodedImageUrl}/comments`, {
        comment,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw new Error('Failed to add comment');
    }
  }

  async getComments(
    artistId: string, 
    imageUrl: string, 
    page = 1, 
    limit = 20
  ): Promise<GalleryCommentsResponse> {
    const encodedImageUrl = encodeURIComponent(imageUrl);
    
    try {
      const response = await apiClient.get(`/gallery/${artistId}/${encodedImageUrl}/comments`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      throw new Error('Failed to fetch comments');
    }
  }

  async getInteractionStats(
    artistId: string, 
    imageUrls: string[]
  ): Promise<GalleryInteractionStats[]> {
    const encodedUrls = imageUrls.map(url => encodeURIComponent(url)).join(',');
    
    try {
      const response = await apiClient.get(`/gallery/${artistId}/stats`, {
        params: { imageUrls: encodedUrls }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch interaction stats:', error);
      throw new Error('Failed to fetch interaction stats');
    }
  }
}

export const galleryInteractionService = new GalleryInteractionService();