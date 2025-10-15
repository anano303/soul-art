"use client";

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { galleryInteractionService, GalleryComment } from '@/lib/gallery-interaction.service';
import { useUser } from '@/modules/auth/hooks/use-user';

interface GalleryCommentsProps {
  artistId: string;
  imageUrl: string;
  initialCommentsCount: number;
  onCommentsCountChange?: (count: number) => void;
  autoExpanded?: boolean; // For gallery viewer
}

export function GalleryComments({
  artistId,
  imageUrl,
  initialCommentsCount,
  onCommentsCountChange,
  autoExpanded = false,
}: GalleryCommentsProps) {
  const { user } = useUser();
  const [comments, setComments] = useState<GalleryComment[]>([]);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(autoExpanded);
  const [hasLoadedComments, setHasLoadedComments] = useState(false);
  const commentsListRef = useRef<HTMLDivElement>(null);

  // Reset component state when image or artist changes
  useEffect(() => {
    setComments([]);
    setCommentsCount(initialCommentsCount);
    setHasLoadedComments(false);
    setShowComments(autoExpanded);
  }, [artistId, imageUrl, initialCommentsCount, autoExpanded]);

  // Auto-load comments if auto-expanded
  useEffect(() => {
    if (autoExpanded && !hasLoadedComments) {
      loadComments();
    }
  }, [autoExpanded, hasLoadedComments]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when in viewer mode and comments change
  useEffect(() => {
    if (autoExpanded && commentsListRef.current && comments.length > 0) {
      const scrollContainer = commentsListRef.current;
      const shouldScrollToBottom = scrollContainer.scrollHeight > scrollContainer.clientHeight;
      
      if (shouldScrollToBottom) {
        // If content overflows, scroll to bottom
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [comments, autoExpanded]);

  const loadComments = async () => {
    if (hasLoadedComments || isLoading) return;
    
    setIsLoading(true);
    try {
      const result = await galleryInteractionService.getComments(artistId, imageUrl);
      setComments(result.comments.reverse()); // Reverse to show oldest first (Instagram-like)
      setCommentsCount(result.total);
      setHasLoadedComments(true);
      onCommentsCountChange?.(result.total);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleComments = () => {
    // Only allow toggling when autoExpanded is true (in viewer mode)
    if (!autoExpanded) return;
    
    setShowComments(!showComments);
    if (!showComments && !hasLoadedComments) {
      loadComments();
    }
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const comment = await galleryInteractionService.addComment(
        artistId,
        imageUrl,
        newComment.trim()
      );
      setComments([...comments, comment]);
      setCommentsCount(commentsCount + 1);
      setNewComment('');
      onCommentsCountChange?.(commentsCount + 1);
      
      // Auto-scroll to bottom after adding comment
      setTimeout(() => {
        if (commentsListRef.current) {
          commentsListRef.current.scrollTop = commentsListRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAddComment();
    }
  };

  return (
    <div className="gallery-comments">
      <button
        type="button"
        className={`gallery-comments__toggle ${!autoExpanded ? 'gallery-comments__toggle--disabled' : ''}`}
        onClick={handleToggleComments}
      >
        <MessageCircle className="gallery-comments__icon" size={16} />
        <span className="gallery-comments__count">{commentsCount}</span>
      </button>

      {showComments && (
        <div className="gallery-comments__panel">
          <div className="gallery-comments__list-wrapper">
            <div className="gallery-comments__list" ref={commentsListRef}>
              {isLoading ? (
                <div className="gallery-comments__loading">Loading comments...</div>
              ) : comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="gallery-comment">
                    <div className="gallery-comment__header">
                      <span className="gallery-comment__author">
                        {comment.user?.storeName || comment.user?.name || 'Anonymous'}
                      </span>
                      <span className="gallery-comment__date">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="gallery-comment__text">{comment.comment}</p>
                  </div>
                ))
              ) : (
                <div className="gallery-comments__empty">
                  No comments yet. Be the first to comment!
                </div>
              )}
            </div>
          </div>

          {user && (
            <div className="gallery-comments__form">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Add a comment..."
                className="gallery-comments__input"
                rows={3}
                maxLength={500}
              />
              <div className="gallery-comments__form-actions">
                <span className="gallery-comments__char-count">
                  {newComment.length}/500
                </span>
                <button
                  type="button"
                  className="gallery-comments__submit"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmitting}
                >
                  <Send size={16} />
                  {isSubmitting ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}