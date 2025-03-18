import { useState } from "react";
import { StarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import "./ReviewForm.css";

interface ReviewFormProps {
  productId: string;
  onSuccess: () => void;
}

export function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast({
        title: "Error",
        description: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    if (!comment.trim()) {
      toast({
        title: "Error",
        description: "Please enter a review comment",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.put(`/products/${productId}/review`, {
        rating,
        comment,
      });

      toast({
        title: "Success",
        description: "Review submitted successfully",
      });

      setRating(0);
      setComment("");
      onSuccess();
    } catch (error: unknown) {
      let errorMessage = "Failed to submit review";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
      ) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="review-form">
      <div className="review-section">
        <label className="review-label">Rating</label>
        <div className="review-stars">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoveredRating(value)}
              onMouseLeave={() => setHoveredRating(0)}
              className="review-star-button"
            >
              <StarIcon
                className={`review-star ${
                  value <= (hoveredRating || rating)
                    ? "filled-star"
                    : "empty-star"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="review-section">
        <label htmlFor="comment" className="review-label">
          Review
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write your review here..."
          className="review-textarea"
        />
      </div>

      <button type="submit" disabled={isSubmitting} className="review-submit">
        {isSubmitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
