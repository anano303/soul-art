import { Pencil, Trash2, CheckCircle, XCircle, Megaphone, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { Product, ProductStatus } from "@/types";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import "./productActions.css";
import { useUser } from "@/modules/auth/hooks/use-user";
import { Role } from "@/types/role";
import Link from "next/link";

interface ProductsActionsProps {
  product: Product;
  onStatusChange?: (productId: string, newStatus: ProductStatus) => void;
  onDelete?: () => void;
}

export function ProductsActions({
  product,
  onStatusChange,
  onDelete,
}: ProductsActionsProps) {
  const router = useRouter();
  const { user } = useUser();
  const [isPosting, setIsPosting] = useState(false);

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

  const handleStatusChange = async (newStatus: ProductStatus) => {
    try {
      const response = await fetchWithAuth(`/products/${product._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      onStatusChange?.(product._id, newStatus);

      toast({
        title: "Status Updated",
        description:
          newStatus === ProductStatus.APPROVED
            ? "Product has been approved"
            : "Product has been rejected",
      });

      // Don't use router.refresh() - let the parent component handle the update
    } catch (error) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Error",
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
        { method: "POST" }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "Failed to post to Facebook"
        );
      }

      const postId: string | undefined = data?.postId;
      toast({
        title: "Posted to Facebook",
        description: postId ? `Post ID: ${postId}` : "The product was posted.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Facebook post failed",
        description: error?.message || "Please check server logs and config",
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
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
            title="Approve product"
          >
            <CheckCircle className="actions approve" />
          </button>
          <button
            onClick={() => handleStatusChange(ProductStatus.REJECTED)}
            className="text-red-500 hover:text-red-600"
            title="Reject product"
          >
            <XCircle className="actions reject" />
          </button>
        </>
      )}

      {isAdmin && (
        <button
          className="fb-btn"
          onClick={handlePostToFacebook}
          title="Post to Facebook"
          disabled={isPosting}
        >
          {isPosting ? (
            <Loader2 className="actions fb-post spin" />
          ) : (
            <Megaphone className="actions fb-post" />
          )}
        </button>
      )}

      <button
        className="text-red-500 hover:text-red-600"
        onClick={handleDelete}
      >
        <Trash2 className="actions trash" />
      </button>
    </div>
  );
}
