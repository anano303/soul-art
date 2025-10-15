"use client";

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { galleryInteractionService } from '@/lib/gallery-interaction.service';
import { useUser } from '@/modules/auth/hooks/use-user';

interface GalleryLikeButtonProps {
  artistId: string;
  imageUrl: string;
  initialLikesCount: number;
  initialIsLiked: boolean;
  onLikeToggle?: (isLiked: boolean, likesCount: number) => void;
}

export function GalleryLikeButton({
  artistId,
  imageUrl,
  initialLikesCount,
  initialIsLiked,
  onLikeToggle,
}: GalleryLikeButtonProps) {
  const { user } = useUser();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading] = useState(false);

  // Reset component state when image or artist changes
  useEffect(() => {
    setIsLiked(initialIsLiked);
    setLikesCount(initialLikesCount);
  }, [artistId, imageUrl, initialIsLiked, initialLikesCount]);

  const handleToggleLike = async () => {
    if (!user || isLoading) return;

    console.log('Attempting to toggle like for:', { artistId, imageUrl, user: user.name });
    setIsLoading(true);
    try {
      const result = await galleryInteractionService.toggleLike(artistId, imageUrl);
      console.log('Like toggle successful:', result);
      setIsLiked(result.isLiked);
      setLikesCount(result.likesCount);
      onLikeToggle?.(result.isLiked, result.likesCount);
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Show user-friendly error message
      alert('Failed to update like. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="gallery-like-button gallery-like-button--disabled">
        <Heart className="gallery-like-button__icon" size={16} />
        <span className="gallery-like-button__count">{likesCount}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`gallery-like-button ${isLiked ? 'gallery-like-button--liked' : ''} ${
        isLoading ? 'gallery-like-button--loading' : ''
      }`}
      onClick={handleToggleLike}
      disabled={isLoading}
    >
      <Heart 
        className="gallery-like-button__icon" 
        size={16} 
        fill={isLiked ? 'currentColor' : 'none'}
      />
      <span className="gallery-like-button__count">{likesCount}</span>
    </button>
  );
}