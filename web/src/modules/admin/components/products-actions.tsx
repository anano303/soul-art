import {
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Megaphone,
  Loader2,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/hooks/use-toast";
import { Product, ProductStatus } from "@/types";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import "./productActions.css";
import { useUser } from "@/modules/auth/hooks/use-user";
import { Role } from "@/types/role";
import Link from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";
import { TikTokPostModal } from "./TikTokPostModal";

interface ProductsActionsProps {
  product: Product;
  onStatusChange?: (productId: string, newStatus: ProductStatus) => void;
  onDelete?: () => void;
  materials?: string[];
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
}

export function ProductsActions({
  product,
  onStatusChange,
  onDelete,
}: ProductsActionsProps) {
  const { user } = useUser();
  const { language } = useLanguage();
  const [isPosting, setIsPosting] = useState(false);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // For portal rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  console.log("Current user from useUser:", user);

  // Just check for admin role
  const isAdmin = user?.role === Role.Admin;
  console.log("Role check:", {
    userRole: user?.role,
    adminRole: Role.Admin,
    isAdmin,
  });

  const handleDelete = async () => {
    if (!product._id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid product ID. Please refresh the page.",
      });
      return;
    }

    if (confirm("Are you sure you want to delete this product?")) {
      try {
        const response = await fetchWithAuth(`/products/${product._id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: "Product deleted successfully",
          });

          onDelete?.();
        } else {
          throw new Error("Failed to delete product");
        }
      } catch (error) {
        console.log(error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete product",
        });
      }
    }
  };

  const handleStatusChange = async (
    newStatus: ProductStatus,
    reason?: string,
  ) => {
    try {
      const body: { status: ProductStatus; rejectionReason?: string } = {
        status: newStatus,
      };
      if (newStatus === ProductStatus.REJECTED && reason) {
        body.rejectionReason = reason;
      }

      const response = await fetchWithAuth(`/products/${product._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      onStatusChange?.(product._id, newStatus);

      toast({
        title: language === "en" ? "Status Updated" : "სტატუსი განახლდა",
        description:
          newStatus === ProductStatus.APPROVED
            ? language === "en"
              ? "Product has been approved"
              : "პროდუქტი დამტკიცდა"
            : language === "en"
              ? "Product has been rejected"
              : "პროდუქტი უარყოფილია",
      });

      // Don't use router.refresh() - let the parent component handle the update
    } catch (error) {
      console.log(error);
      toast({
        variant: "destructive",
        title: language === "en" ? "Error" : "შეცდომა",
        description: "Failed to update product status",
      });
    }
  };

  const handlePostToFacebook = async () => {
    if (!product._id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid product ID. Please refresh the page.",
      });
      return;
    }

    try {
      setIsPosting(true);
      const response = await fetchWithAuth(
        `/products/${product._id}/post-to-facebook`,
        {
          method: "POST",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "Failed to post to social media",
        );
      }

      const platforms: string[] = data?.platforms || [];
      const platformsText =
        platforms.length > 0 ? platforms.join(", ") : "Facebook";

      toast({
        title: "Posted to Social Media",
        description: `Successfully posted to: ${platformsText}`,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Please check server logs and config";
      toast({
        variant: "destructive",
        title: "Social media post failed",
        description: message,
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostToTikTok = () => {
    setShowTikTokModal(true);
  };

  const handleRejectClick = () => {
    setShowRejectModal(true);
    setRejectionReason("");
  };

  const handleConfirmReject = async () => {
    setIsRejecting(true);
    await handleStatusChange(ProductStatus.REJECTED, rejectionReason);
    setIsRejecting(false);
    setShowRejectModal(false);
    setRejectionReason("");
  };

  return (
    <>
      {/* Rejection Modal - rendered via portal to body */}
      {mounted &&
        showRejectModal &&
        createPortal(
          <div
            className="rejection-modal-overlay"
            onClick={() => setShowRejectModal(false)}
          >
            <div
              className="rejection-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rejection-modal__header">
                <h3>
                  {language === "en" ? "Reject Product" : "პროდუქტის უარყოფა"}
                </h3>
                <button
                  type="button"
                  className="rejection-modal__close"
                  onClick={() => setShowRejectModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="rejection-modal__body">
                <label htmlFor="rejectionReason">
                  {language === "en"
                    ? "Reason for rejection (optional):"
                    : "უარყოფის მიზეზი (არასავალდებულო):"}
                </label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={
                    language === "en"
                      ? "Enter the reason why this product is being rejected..."
                      : "შეიყვანე მიზეზი რატომ უარყოფ ამ პროდუქტს..."
                  }
                  rows={4}
                />
              </div>
              <div className="rejection-modal__actions">
                <button
                  type="button"
                  className="rejection-modal__cancel"
                  onClick={() => setShowRejectModal(false)}
                  disabled={isRejecting}
                >
                  {language === "en" ? "Cancel" : "გაუქმება"}
                </button>
                <button
                  type="button"
                  className="rejection-modal__confirm"
                  onClick={handleConfirmReject}
                  disabled={isRejecting}
                >
                  {isRejecting
                    ? language === "en"
                      ? "Rejecting..."
                      : "უარყოფა..."
                    : language === "en"
                      ? "Reject Product"
                      : "პროდუქტის უარყოფა"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <div className="space-x-2">
        <Link
          href={{
            pathname: `/admin/products/edit`,
            query: { id: product._id, refresh: Date.now() }, // Add a timestamp to force refresh
          }}
          className="prd-action-link prd-action-edit"
        >
          <Pencil className="actions edit" />
        </Link>

        {/* Showing status buttons? {isAdmin && product.status === ProductStatus.PENDING} */}
        {isAdmin && product.status === ProductStatus.PENDING && (
          <>
            <button
              onClick={() => handleStatusChange(ProductStatus.APPROVED)}
              className="text-green-500 hover:text-green-600"
              title={
                language === "en" ? "Approve product" : "პროდუქტის დამტკიცება"
              }
            >
              <CheckCircle className="actions approve" />
            </button>
            <button
              onClick={handleRejectClick}
              className="text-red-500 hover:text-red-600"
              title={language === "en" ? "Reject product" : "პროდუქტის უარყოფა"}
            >
              <XCircle className="actions reject" />
            </button>
          </>
        )}

        {isAdmin && (
          <button
            className="fb-btn"
            onClick={handlePostToFacebook}
            title="Post to all social media (FB, Instagram, Groups)"
            disabled={isPosting}
          >
            {isPosting ? (
              <Loader2 className="actions fb-post spin" />
            ) : (
              <Megaphone className="actions fb-post" />
            )}
          </button>
        )}

        {isAdmin && (
          <button
            className="tiktok-btn"
            onClick={handlePostToTikTok}
            title="Post to TikTok"
          >
            <svg
              className="actions tiktok-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.7a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.13z" />
            </svg>
          </button>
        )}

        {/* TikTok Post Modal */}
        <TikTokPostModal
          product={product}
          isOpen={showTikTokModal}
          onClose={() => setShowTikTokModal(false)}
        />

        <button
          className="text-red-500 hover:text-red-600"
          onClick={handleDelete}
        >
          <Trash2 className="actions trash" />
        </button>
      </div>
    </>
  );
}
