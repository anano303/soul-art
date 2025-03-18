import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import type { Product } from "@/types";
import "./productActions.css";

interface ProductsActionsProps {
  product: Product;
}

export function ProductsActions({ product }: ProductsActionsProps) {
  const router = useRouter();

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
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/products/${product._id}`,
          {
            method: "DELETE",
          }
        );

        if (response.ok) {
          toast({
            title: "Success",
            description: "Product deleted successfully",
          });

          router.refresh(); // Refresh page or go back to the list
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

  return (
    <div className="space-x-2">
      <button
        onClick={() =>
          router.push(`/admin/products/${product._id}/edit?id=${product._id}`)
        }
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        className="text-red-500 hover:text-red-600"
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
