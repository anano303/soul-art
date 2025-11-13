"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { apiClient } from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";
import "./artist-review-modal.css";

interface ArtistReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistId: string;
  artistName: string;
  onSuccess: () => void;
}

export function ArtistReviewModal({
  isOpen,
  onClose,
  artistId,
  artistName,
  onSuccess,
}: ArtistReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast({
        title: language === "en" ? "Error" : "შეცდომა",
        description:
          language === "en"
            ? "Please select a rating"
            : "გთხოვთ აირჩიოთ შეფასება",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post(`/artists/${artistId}/review`, {
        rating,
        comment: comment.trim() || undefined,
      });

      toast({
        title: language === "en" ? "Success" : "წარმატებული",
        description:
          language === "en"
            ? "Review submitted successfully"
            : "შეფასება წარმატებით გაიგზავნა",
      });

      setRating(0);
      setComment("");
      onSuccess();
      onClose();
    } catch (error: any) {
      let errorMessage =
        language === "en"
          ? "Failed to submit review"
          : "შეფასება ვერ გაიგზავნა";

      if (error?.response?.status === 401) {
        errorMessage =
          language === "en"
            ? "Please log in to submit a review"
            : "გთხოვთ გაიაროთ ავტორიზაცია შეფასების დასატოვებლად";
      } else if (
        error?.response?.status === 400 &&
        error?.response?.data?.message?.includes("cannot review yourself")
      ) {
        errorMessage =
          language === "en"
            ? "You cannot review yourself"
            : "საკუთარი თავის შეფასება არ შეგიძლიათ";
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast({
        title: language === "en" ? "Error" : "შეცდომა",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="artist-review-modal-overlay" onClick={onClose}>
      <div
        className="artist-review-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="artist-review-modal-header">
          <h2>
            {language === "en" ? "Rate Artist" : "მხატვრის შეფასება"}:{" "}
            {artistName}
          </h2>
          <button
            className="artist-review-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="artist-review-modal-form">
          <div className="artist-review-modal-rating">
            <label>
              {language === "en" ? "Your Rating" : "თქვენი შეფასება"}:
            </label>
            <div className="artist-review-modal-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`artist-review-modal-star ${
                    star <= (hoveredRating || rating)
                      ? "artist-review-modal-star--filled"
                      : ""
                  }`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="artist-review-modal-comment">
            <label htmlFor="comment">
              {language === "en"
                ? "Your Review (Optional)"
                : "თქვენი მიმოხილვა (არასავალდებულო)"}
              :
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                language === "en"
                  ? "Share your experience with this artist..."
                  : "გაგვიზიარეთ თქვენი გამოცდილება ამ მხატვართან..."
              }
              rows={4}
              maxLength={500}
            />
            <div className="artist-review-modal-char-count">
              {comment.length}/500
            </div>
          </div>

          <div className="artist-review-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="artist-review-modal-cancel"
              disabled={isSubmitting}
            >
              {language === "en" ? "Cancel" : "გაუქმება"}
            </button>
            <button
              type="submit"
              className="artist-review-modal-submit"
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting
                ? language === "en"
                  ? "Submitting..."
                  : "იგზავნება..."
                : language === "en"
                ? "Submit Review"
                : "გაგზავნა"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
