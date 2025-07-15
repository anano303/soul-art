"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useParams } from "next/navigation";
import HeartLoading from "@/components/HeartLoading/HeartLoading";
import { ProductDetails } from "@/modules/products/components/product-details";

// Note: For dynamic pages, we need to use client component for now
// In a real implementation, you'd want to use generateMetadata in a server component

export default function ProductPage() {
  const params = useParams();
  const id = params?.id ? (params.id as string) : "";

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const response = await fetchWithAuth(`/products/${id}`);
      return response.json();
    },
  });

  if (isLoading) return <HeartLoading size="medium" />;
  if (!product) return <div>Product not found</div>;

  return (
    <div className="Container">
      <ProductDetails product={product} />
    </div>
  );
}
