"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Send, MessageCircle, User, ChevronDown } from "lucide-react";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-hot-toast";
import "./auction-comments.css";

interface Comment {
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
  userName: string;
  userAvatar?: string;
}

interface AuctionCommentsProps {
  auctionId: string;
  onAuthRequired?: () => void;
}

export function AuctionComments({
  auctionId,
  onAuthRequired,
}: AuctionCommentsProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const COMMENTS_PER_PAGE = 5;

  const fetchComments = useCallback(
    async (pageNum: number, prepend = false) => {
      try {
        const response = await apiClient.get(
          `/auctions/${auctionId}/comments`,
          {
            params: { page: pageNum, limit: COMMENTS_PER_PAGE },
          }
        );

        if (prepend) {
          // Prepend older comments at the beginning
          setComments((prev) => [...response.data.comments, ...prev]);
        } else {
          setComments(response.data.comments);
        }

        setTotal(response.data.total);
        setHasMore(response.data.hasMore);
      } catch (error) {
        console.error("Failed to fetch comments:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [auctionId]
  );

  useEffect(() => {
    fetchComments(1);
  }, [fetchComments]);

  const handleLoadPrevious = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage, true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      if (onAuthRequired) {
        onAuthRequired();
      } else {
        toast.error(
          t("auctions.loginToComment") || "კომენტარისთვის გაიარეთ ავტორიზაცია"
        );
      }
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiClient.post(
        `/auctions/${auctionId}/comments`,
        {
          content: newComment.trim(),
        }
      );

      // Add new comment to the top of the list
      setComments((prev) => [response.data, ...prev]);
      setTotal((prev) => prev + 1);
      setNewComment("");

      toast.success(
        t("auctions.commentAdded") || "კომენტარი დაემატა"
      );
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast.error(
        t("auctions.commentError") || "კომენტარის დამატება ვერ მოხერხდა"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return language === "ge" ? "ახლახან" : "just now";
    }
    if (diffMins < 60) {
      return language === "ge" ? `${diffMins} წთ წინ` : `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return language === "ge" ? `${diffHours} სთ წინ` : `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return language === "ge" ? `${diffDays} დღის წინ` : `${diffDays}d ago`;
    }

    return date.toLocaleDateString(language === "ge" ? "ka-GE" : "en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <section className="auction-comments-section">
      <div className="comments-header">
        <MessageCircle size={24} className="comments-icon" />
        <h2 className="comments-title">
          {t("auctions.comments") || "კომენტარები"}
          {total > 0 && <span className="comments-count">({total})</span>}
        </h2>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="comment-form">
        <div className="comment-input-wrapper">
          <div className="comment-avatar">
            {user?.profileImage ? (
              <Image src={user.profileImage} alt="" width={40} height={40} />
            ) : (
              <User size={20} />
            )}
          </div>
          <input
            type="text"
            placeholder={
              user
                ? t("auctions.writeComment") || "დაწერეთ კომენტარი..."
                : t("auctions.loginToComment") ||
                  "კომენტარისთვის გაიარეთ ავტორიზაცია"
            }
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            maxLength={1000}
            disabled={submitting}
            className="comment-input"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="comment-submit"
          >
            {submitting ? (
              <div className="comment-spinner" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="comments-list">
        {loading ? (
          <div className="comments-loading">
            <div className="loading-spinner-small" />
            <span>{t("common.loading") || "იტვირთება..."}</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="no-comments">
            <MessageCircle size={40} />
            <p>
              {t("auctions.noComments") ||
                "ჯერ არ არის კომენტარები. იყავით პირველი!"}
            </p>
          </div>
        ) : (
          <>
            {comments.map((comment, index) => (
              <div key={index} className="comment-item">
                <div className="comment-avatar-wrapper">
                  {comment.userAvatar ? (
                    <Image
                      src={comment.userAvatar}
                      alt={comment.userName}
                      width={44}
                      height={44}
                      className="comment-user-avatar"
                    />
                  ) : (
                    <div className="comment-avatar-placeholder">
                      {getInitials(comment.userName)}
                    </div>
                  )}
                </div>
                <div className="comment-content">
                  <div className="comment-meta">
                    <span className="comment-author">{comment.userName}</span>
                    <span className="comment-time">
                      {formatTimeAgo(comment.createdAt)}
                    </span>
                  </div>
                  <p className="comment-text">{comment.content}</p>
                </div>
              </div>
            ))}

          </>
        )}
      </div>

      {/* Load Previous Button - at the bottom */}
      {hasMore && (
        <button
          onClick={handleLoadPrevious}
          disabled={loadingMore}
          className="load-more-comments"
        >
          {loadingMore ? (
            <div className="comment-spinner" />
          ) : (
            <>
              <ChevronDown size={18} />
              {t("auctions.loadPreviousComments") || "წინა კომენტარების ჩატვირთვა"}
            </>
          )}
        </button>
      )}
    </section>
  );
}

export default AuctionComments;
