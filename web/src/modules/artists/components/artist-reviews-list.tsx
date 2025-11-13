"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import "./artist-reviews-list.css";

interface Review {
  userId: {
    _id: string;
    name: string;
    email: string;
    profileImage?: string;
    storeLogo?: string;
  };
  rating: number;
  comment?: string;
  createdAt: string;
}

interface ArtistReviewsListProps {
  artistId: string;
}

export function ArtistReviewsList({ artistId }: ArtistReviewsListProps) {
  const { language } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [artistDirectRating, setArtistDirectRating] = useState(0);
  const [artistDirectReviewsCount, setArtistDirectReviewsCount] = useState(0);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/artists/${artistId}/reviews`);
        setReviews(response.data.reviews || []);
        setArtistDirectRating(response.data.artistDirectRating || 0);
        setArtistDirectReviewsCount(
          response.data.artistDirectReviewsCount || 0
        );
      } catch (error) {
        console.error("Failed to fetch artist reviews:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [artistId]);

  if (loading) {
    return (
      <div className="artist-reviews-loading">
        {language === "en" ? "Loading reviews..." : "იტვირთება შეფასებები..."}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="artist-reviews-empty">
        <p>
          {language === "en"
            ? "No reviews yet. Be the first to review this artist!"
            : "ჯერ არ არის შეფასებები. იყავი პირველი ვინც შეაფასებს ამ მხატვარს!"}
        </p>
      </div>
    );
  }

  return (
    <div className="artist-reviews-list">
      <div className="artist-reviews-summary">
        <h3>{language === "en" ? "Artist Reviews" : "მხატვრის შეფასებები"}</h3>
        <div className="artist-reviews-summary-stats">
          <div className="artist-reviews-summary-rating">
            <span className="artist-reviews-summary-number">
              {artistDirectRating.toFixed(1)}
            </span>
            <div className="artist-reviews-summary-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`artist-reviews-summary-star ${
                    star <= Math.round(artistDirectRating)
                      ? "artist-reviews-summary-star--filled"
                      : ""
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          <p className="artist-reviews-summary-count">
            {language === "en"
              ? `Based on ${artistDirectReviewsCount} review${
                  artistDirectReviewsCount !== 1 ? "s" : ""
                }`
              : `${artistDirectReviewsCount} შეფასებაზე დაყრდნობით`}
          </p>
        </div>
      </div>

      <div className="artist-reviews-items">
        {reviews.map((review, index) => (
          <div key={index} className="artist-review-item">
            <div className="artist-review-header">
              <div className="artist-review-user">
                <div className="artist-review-avatar">
                  {review.userId?.profileImage || review.userId?.storeLogo ? (
                    <Image
                      src={
                        review.userId.profileImage || review.userId.storeLogo!
                      }
                      alt={review.userId?.name || "User"}
                      fill
                      className="artist-review-avatar-image"
                    />
                  ) : (
                    <span className="artist-review-avatar-letter">
                      {review.userId?.name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                <div className="artist-review-user-info">
                  <span className="artist-review-username">
                    {review.userId?.name || "Anonymous"}
                  </span>
                  <span className="artist-review-date">
                    {new Date(review.createdAt).toLocaleDateString(
                      language === "en" ? "en-US" : "ka-GE",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>
              </div>
              <div className="artist-review-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`artist-review-star ${
                      star <= review.rating ? "artist-review-star--filled" : ""
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            {review.comment && (
              <p className="artist-review-comment">{review.comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
