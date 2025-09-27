import { useState } from "react";
import { StarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/axios";
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
  const [showPurchaseError, setShowPurchaseError] = useState(false);
  const [isUnauthorizedError, setIsUnauthorizedError] = useState(false);
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
      // Use a more specific type for fullError
      let fullError: Record<string, unknown> = {};

      // Handle different error types
      if (error instanceof Error) {
        errorMessage = error.message;
        fullError = { message: error.message };
      } else if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        error.response !== null &&
        typeof error.response === "object"
      ) {
        const axiosError = error as {
          response?: {
            data?: Record<string, unknown> | string;
            status?: number;
          };
        };

        // Store the status code in fullError
        if (axiosError.response?.status) {
          fullError.statusCode = axiosError.response.status;
        }

        // Try different error message fields
        if (axiosError.response?.data) {
          if (typeof axiosError.response.data === "string") {
            errorMessage = axiosError.response.data;
            fullError = { message: axiosError.response.data };
          } else if (typeof axiosError.response.data === "object") {
            const responseData = axiosError.response.data as Record<
              string,
              unknown
            >;
            errorMessage =
              (responseData.message as string) ||
              (responseData.error as string) ||
              errorMessage;

            fullError = responseData;
          }
        }
      }

      // Debug: log the error to see what we're getting
      console.log("Full error object:", fullError);
      console.log("Error message:", errorMessage);

      // Log the actual error object for debugging
      console.log("Original error object:", error);
      if (typeof error === "object" && error !== null && "response" in error) {
        const axiosError = error as {
          response?: {
            status?: number;
            data?: unknown;
          };
        };
        console.log("Error response status:", axiosError.response?.status);
        console.log("Error response data:", axiosError.response?.data);
      }

      // Check for 401 Unauthorized first
      const isUnauthorizedError =
        (typeof error === "object" &&
          error !== null &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "status" in error.response &&
          error.response.status === 401) ||
        (typeof fullError === "object" &&
          fullError !== null &&
          "statusCode" in fullError &&
          fullError.statusCode === 401); // If unauthorized, show login required message
      if (isUnauthorizedError) {
        console.log("Unauthorized error detected");
        toast({
          title: "ავტორიზაცია საჭიროა / Authorization Required",
          description:
            "გთხოვთ გაიაროთ ავტორიზაცია შეფასების დასატოვებლად / Please log in to submit a review",
          variant: "destructive",
        });

        // Show unauthorized popup
        setIsUnauthorizedError(true);
        setShowPurchaseError(false); // Reset first to ensure state changes
        setTimeout(() => {
          setShowPurchaseError(true);
        }, 100);
        return;
      }

      // For status code 400, assume it's the "You can only review products you have purchased" error
      // This is based on the server implementation we examined
      const isBadRequestError =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "status" in error.response &&
        error.response.status === 400;

      if (isBadRequestError) {
        console.log(
          "Bad Request (400) detected - assuming 'only purchased products' error"
        );
        toast({
          title: "შეზღუდული წვდომა / Access Restricted",
          description:
            "მხოლოდ ნაყიდი პროდუქტების შეფასება შეგიძლიათ / You can only review products you have purchased",
          variant: "destructive",
        });

        setIsUnauthorizedError(false);
        setShowPurchaseError(false); // Reset first to ensure state changes
        setTimeout(() => {
          setShowPurchaseError(true);
        }, 100);
        return;
      }

      // Special handling for purchase requirement error - more reliable detection
      const isPurchaseError =
        // Check for 400 Bad Request which is returned for "products you have purchased" error
        (typeof error === "object" &&
          error !== null &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "status" in error.response &&
          error.response.status === 400) ||
        // Check for string messages about purchased products
        (typeof errorMessage === "string" &&
          (errorMessage.includes(
            "You can only review products you have purchased"
          ) ||
            errorMessage.includes("only review") ||
            errorMessage.includes("purchased"))) ||
        (typeof fullError === "object" &&
          fullError !== null &&
          // Safely check message property
          (("message" in fullError &&
            typeof fullError.message === "string" &&
            fullError.message.includes("purchased")) ||
            // Safely check code property
            ("code" in fullError &&
              fullError.code === "PRODUCT_NOT_PURCHASED") ||
            // Safely check statusCode and message
            ("statusCode" in fullError &&
              (fullError.statusCode === 400 || fullError.statusCode === 403) &&
              (("message" in fullError &&
                typeof fullError.message === "string" &&
                fullError.message.includes("purchased")) ||
                true)))); // For 400 errors, assume it's a purchase error

      console.log("Is purchase error?", isPurchaseError);

      if (isPurchaseError) {
        console.log("Showing purchase error popup");
        // Show both toast and custom popup
        toast({
          title: "შეზღუდული წვდომა / Access Restricted",
          description:
            "მხოლოდ ნაყიდი პროდუქტების შეფასება შეგიძლიათ / You can only review products you have purchased",
          variant: "destructive",
        });

        // Force show custom popup with a short delay to ensure it renders after state update
        setShowPurchaseError(false); // Reset first to ensure state changes
        setTimeout(() => {
          setShowPurchaseError(true);
        }, 100);
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Purchase Error Popup */}
      {showPurchaseError && (
        <div
          className="error-popup-overlay"
          onClick={() => {
            setShowPurchaseError(false);
            setIsUnauthorizedError(false);
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999999,
            pointerEvents: "auto",
          }}
        >
          <div
            className="error-popup"
            onClick={(e) => e.stopPropagation()}
            style={{
              zIndex: 10000000,
              backgroundColor: "#2e3440",
              border: "2px solid #e6cd9f",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "450px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
              position: "relative",
              pointerEvents: "auto",
            }}
          >
            <div className="error-popup-header">
              <h3>
                {isUnauthorizedError
                  ? "⚠️ ავტორიზაცია საჭიროა"
                  : "⚠️ შეზღუდული წვდომა"}
              </h3>
              <button
                className="error-popup-close"
                onClick={() => {
                  setShowPurchaseError(false);
                  setIsUnauthorizedError(false);
                }}
              >
                ×
              </button>
            </div>
            <div className="error-popup-body">
              {isUnauthorizedError ? (
                <>
                  <p>გთხოვთ გაიაროთ ავტორიზაცია შეფასების დასატოვებლად.</p>
                  <p>
                    <em>Please log in to submit a review.</em>
                  </p>
                </>
              ) : (
                <>
                  <p>მხოლოდ ნაყიდი პროდუქტების შეფასება შეგიძლიათ.</p>
                  <p>
                    <em>You can only review products you have purchased.</em>
                  </p>
                </>
              )}
            </div>
            <div className="error-popup-footer">
              <button
                className="error-popup-button"
                onClick={() => {
                  setShowPurchaseError(false);
                  setIsUnauthorizedError(false);
                }}
              >
                გასაგებია / OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="review-info">
        <p className="review-info-text">
          📝 მხოლოდ ნაყიდი პროდუქტების შეფასება შეგიძლიათ
          <br />
          Only purchased products can be reviewed
        </p>
      </div>

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
    </div>
  );
}
