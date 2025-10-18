"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Users } from 'lucide-react';
import Image from 'next/image';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import './followers-modal.css';

interface Follower {
  _id: string;
  name: string;
  email?: string;
  profileImagePath?: string;
  storeName?: string;
  artistSlug?: string;
}

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistId: string;
  artistName: string;
}

export function FollowersModal({ 
  isOpen, 
  onClose, 
  artistId, 
  artistName 
}: FollowersModalProps) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const loadingRef = useRef(false);

  const loadFollowers = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
    if (!isOpen || loadingRef.current) return;

    loadingRef.current = true;
    setIsLoading(true);

    try {
      const response = await fetchWithAuth(
        `/users/${artistId}/followers?page=${pageNum}&limit=20`
      );
      
      const data = await response.json();
      
      console.log('Followers API response:', data); // Debug log
      
      if (reset) {
        setFollowers(data.items || []);
      } else {
        setFollowers(prev => [...prev, ...(data.items || [])]);
      }
      
      setTotal(data.total || 0);
      setHasMore(pageNum < (data.pages || 0));
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load followers:', error);
      setFollowers([]);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [isOpen, artistId]);

  useEffect(() => {
    if (isOpen) {
      loadFollowers(1, true);
    } else {
      // Reset state when modal closes
      setFollowers([]);
      setPage(1);
      setHasMore(true);
      setTotal(0);
    }
  }, [isOpen, artistId, loadFollowers]);

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      loadFollowers(page + 1, false);
    }
  };

  const getUserDisplayName = (follower: Follower) => {
    return follower.storeName || follower.name;
  };

  const getUserProfileUrl = (follower: Follower) => {
    if (follower.artistSlug) {
      return `/${follower.artistSlug}`;
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="followers-modal-backdrop" onClick={onClose}>
      <div 
        className="followers-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="followers-modal__header">
          <div className="followers-modal__title">
            <Users size={20} />
            <span>Followers of {artistName}</span>
            <span className="followers-modal__count">({total})</span>
          </div>
          <button 
            onClick={onClose}
            className="followers-modal__close"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="followers-modal__content">
          {isLoading && followers.length === 0 ? (
            <div className="followers-modal__loading">
              Loading followers...
            </div>
          ) : followers.length === 0 ? (
            <div className="followers-modal__empty">
              <Users size={48} />
              <p>No followers yet</p>
              <span>Be the first to follow {artistName}!</span>
            </div>
          ) : (
            <>
              <div className="followers-list">
                {followers.map((follower) => {
                  const profileUrl = getUserProfileUrl(follower);
                  const displayName = getUserDisplayName(follower);

                  return (
                    <div key={follower._id} className="follower-item">
                      <div className="follower-item__avatar">
                        {follower.profileImagePath ? (
                          <Image 
                            src={follower.profileImagePath} 
                            alt={displayName}
                            width={40}
                            height={40}
                            className="follower-item__image"
                          />
                        ) : (
                          <div className="follower-item__placeholder">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      <div className="follower-item__info">
                        {profileUrl ? (
                          <a 
                            href={profileUrl}
                            className="follower-item__name follower-item__name--link"
                            onClick={onClose}
                          >
                            {displayName}
                          </a>
                        ) : (
                          <span className="follower-item__name">
                            {displayName}
                          </span>
                        )}
                        {follower.email && (
                          <span className="follower-item__email">
                            {follower.email}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="followers-modal__load-more"
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}