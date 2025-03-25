import { Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { Product, ProductStatus } from "@/types";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import "./productActions.css";
import { useUser } from "@/modules/auth/hooks/use-user";
import { Role } from "@/types/role";

interface ProductsActionsProps {
  product: Product;
  onStatusChange?: (productId: string, newStatus: ProductStatus) => void;
  onDelete?: () => void;
}

export function ProductsActions({ product, onStatusChange, onDelete }: ProductsActionsProps) {
  const router = useRouter();
  const { user } = useUser();
  
  console.log("Current user from useUser:", user);
  
  // შევცვალოთ შემოწმების ლოგიკა lowercase-ზე
  const isAdmin = user?.role === Role.Admin;
  console.log("Role check:", {
    userRole: user?.role,
    adminRole: Role.Admin,
    isAdmin
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      onStatusChange?.(product._id, newStatus);
      
      toast({
        title: "Status Updated",
        description: newStatus === ProductStatus.APPROVED 
          ? "Product has been approved"
          : "Product has been rejected",
      });

      router.refresh();
    } catch (error) {
      console.log(error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update product status",
      });
    }
  };


  return (
    <div className="space-x-2">
      <button
        onClick={() =>
          router.push(`/admin/products/${product._id}/edit?id=${product._id}`)
        }
      >
        <Pencil className="h-4 w-4" />
      </button>
      
   
      {/* Showing status buttons? {isAdmin && product.status === ProductStatus.PENDING} */}
      {isAdmin && product.status === ProductStatus.PENDING && (
        <>
          <button
            onClick={() => handleStatusChange(ProductStatus.APPROVED)}
            className="text-green-500 hover:text-green-600"
            title="Approve product"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleStatusChange(ProductStatus.REJECTED)}
            className="text-red-500 hover:text-red-600"
            title="Reject product"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </>
      )}
      
      <button
        className="text-red-500 hover:text-red-600"
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
