"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import HeartLoading from "@/components/HeartLoading/HeartLoading";
import { ProductDetails } from "@/modules/products/components/product-details";
import { useToast } from "@/hooks/use-toast";

export default function ProductPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const id = params?.id ? (params.id as string) : "";

  // Handle promo payment redirect
  useEffect(() => {
    const promo = searchParams.get("promo");
    if (promo === "success") {
      toast({
        title: "✅ გადახდა წარმატებით შესრულდა!",
        description:
          "რეკლამის მოთხოვნა მიღებულია. რეკლამა გაეშვება მომდევნო 24 საათის განმავლობაში.",
      });
      // Clean up URL
      window.history.replaceState({}, "", `/products/${id}`);
    } else if (promo === "fail") {
      toast({
        variant: "destructive",
        title: "❌ გადახდა ვერ შესრულდა",
        description: "სცადეთ ხელახლა ან დაუკავშირდით მხარდაჭერას.",
      });
      window.history.replaceState({}, "", `/products/${id}`);
    }
  }, [searchParams, id, toast]);

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
