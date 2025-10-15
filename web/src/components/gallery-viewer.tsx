"use client";

import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { CloudinaryImage } from '@/components/cloudinary-image';
import { GalleryLikeButton } from '@/components/gallery-like-button';
import { GalleryComments } from '@/components/gallery-comments';
import { useLanguage } from '@/hooks/LanguageContext';
import { GalleryInteractionStats } from '@/lib/gallery-interaction.service';
import './gallery-viewer.css';

interface GalleryViewerProps {
  images: string[];
  currentIndex: number;
  artist: {
    id: string;
    name: string;
    storeName?: string;
    storeLogo?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  getStatsForImage: (imageUrl: string) => GalleryInteractionStats;
  updateStats: (imageUrl: string, updates: Partial<GalleryInteractionStats>) => void;
}

export function GalleryViewer({
  images,
  currentIndex,
  artist,
  isOpen,
  onClose,
  onIndexChange,
  getStatsForImage,
  updateStats,
}: GalleryViewerProps) {
  const { language } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) {
            onIndexChange(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (currentIndex < images.length - 1) {
            onIndexChange(currentIndex + 1);
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentIndex, images.length, onClose, onIndexChange]);

  if (!isOpen || !images[currentIndex]) return null;

  const currentImage = images[currentIndex];
  const stats = getStatsForImage(currentImage);
  const creationDate = new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'ka-GE');

  return (
    <div className="gallery-viewer" onClick={onClose}>
      {/* Close button */}
      <button 
        className="gallery-viewer__close"
        onClick={onClose}
        type="button"
      >
        <X size={24} />
      </button>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          className="gallery-viewer__nav gallery-viewer__nav--prev"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(currentIndex - 1);
          }}
          type="button"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {currentIndex < images.length - 1 && (
        <button
          className="gallery-viewer__nav gallery-viewer__nav--next"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(currentIndex + 1);
          }}
          type="button"
        >
          <ChevronRight size={32} />
        </button>
      )}

      {/* Main content */}
      <div className="gallery-viewer__content" onClick={(e) => e.stopPropagation()}>
        {/* Image section */}
        <div className="gallery-viewer__image-section">
          <div className="gallery-viewer__image-container">
            <CloudinaryImage
              src={currentImage}
              alt={`Gallery item by ${artist.storeName || artist.name}`}
              width={800}
              height={800}
              className="gallery-viewer__image"
            />
          </div>
          
          {/* Mobile info overlay */}
          <div className="gallery-viewer__mobile-overlay">
            <div className="gallery-viewer__mobile-header">
              <div className="gallery-viewer__artist-info">
                {artist.storeLogo && (
                  <CloudinaryImage
                    src={artist.storeLogo}
                    alt={artist.storeName || artist.name}
                    width={32}
                    height={32}
                    className="gallery-viewer__artist-avatar"
                  />
                )}
                <div>
                  <h3 className="gallery-viewer__artist-name">
                    {artist.storeName || artist.name}
                  </h3>
                  <p className="gallery-viewer__post-date">{creationDate}</p>
                </div>
              </div>
            </div>
            
            <div className="gallery-viewer__mobile-actions">
              <GalleryLikeButton
                artistId={artist.id}
                imageUrl={currentImage}
                initialLikesCount={stats.likesCount}
                initialIsLiked={stats.isLikedByUser}
                onLikeToggle={(isLiked, likesCount) => {
                  updateStats(currentImage, { isLikedByUser: isLiked, likesCount });
                }}
              />
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="gallery-viewer__sidebar">
          {/* Header */}
          <div className="gallery-viewer__header">
            <div className="gallery-viewer__artist-info">
              {artist.storeLogo && (
                <CloudinaryImage
                  src={artist.storeLogo}
                  alt={artist.storeName || artist.name}
                  width={40}
                  height={40}
                  className="gallery-viewer__artist-avatar"
                />
              )}
              <div>
                <h3 className="gallery-viewer__artist-name">
                  {artist.storeName || artist.name}
                </h3>
                <p className="gallery-viewer__post-date">{creationDate}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="gallery-viewer__stats">
            <div className="gallery-viewer__stat gallery-viewer__stat--interactive">
              <GalleryLikeButton
                artistId={artist.id}
                imageUrl={currentImage}
                initialLikesCount={stats.likesCount}
                initialIsLiked={stats.isLikedByUser}
                onLikeToggle={(isLiked, likesCount) => {
                  updateStats(currentImage, { isLikedByUser: isLiked, likesCount });
                }}
              />
            </div>
            <div className="gallery-viewer__stat">
              <MessageCircle size={16} />
              <span>{stats.commentsCount} {language === 'en' ? 'comments' : 'კომენტარი'}</span>
            </div>
          </div>

          {/* Comments section */}
          <div className="gallery-viewer__comments-section">
            <GalleryComments
              artistId={artist.id}
              imageUrl={currentImage}
              initialCommentsCount={stats.commentsCount}
              onCommentsCountChange={(commentsCount) => {
                updateStats(currentImage, { commentsCount });
              }}
              autoExpanded={true}
            />
          </div>


        </div>
      </div>

      {/* Image counter */}
      <div className="gallery-viewer__counter">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}