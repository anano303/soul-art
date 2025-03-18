"use client";

import { ProductDetails } from "@/modules/products/components/product-details";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useParams } from "next/navigation";

export default function ProductPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const response = await fetchWithAuth(`/products/${id}`);
      return response.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div className="Container">
      <ProductDetails product={product} />
    </div>
  );
}
