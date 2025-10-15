"use client";

import { useState, useEffect } from 'react';
import { galleryInteractionService, GalleryInteractionStats } from '@/lib/gallery-interaction.service';

export function useGalleryInteractions(artistId: string, imageUrls: string[]) {
  const [stats, setStats] = useState<Map<string, GalleryInteractionStats>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      if (imageUrls.length === 0) {
        setStats(new Map());
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const statsArray = await galleryInteractionService.getInteractionStats(artistId, imageUrls);
        const statsMap = new Map(statsArray.map(stat => [stat.imageUrl, stat]));
        setStats(statsMap);
        setError(null);
      } catch (err) {
        console.error('Failed to load gallery stats:', err);
        setError('Failed to load gallery statistics');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [artistId, imageUrls]);

  const updateStats = (imageUrl: string, updates: Partial<GalleryInteractionStats>) => {
    setStats(prevStats => {
      const newStats = new Map(prevStats);
      const currentStat = newStats.get(imageUrl);
      if (currentStat) {
        newStats.set(imageUrl, { ...currentStat, ...updates });
      } else {
        newStats.set(imageUrl, {
          imageUrl,
          likesCount: 0,
          commentsCount: 0,
          isLikedByUser: false,
          ...updates,
        });
      }
      return newStats;
    });
  };

  const getStatsForImage = (imageUrl: string): GalleryInteractionStats => {
    return stats.get(imageUrl) || {
      imageUrl,
      likesCount: 0,
      commentsCount: 0,
      isLikedByUser: false,
    };
  };

  return {
    stats,
    isLoading,
    error,
    updateStats,
    getStatsForImage,
  };
}