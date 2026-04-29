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

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const response = await fetchWithAuth(`/products/${id}`);
      return response.json();
    },
    retry: false,
  });

  if (isLoading) return <HeartLoading size="medium" />;
  if (isError || !product) return <div className="Container" style={{ textAlign: 'center', padding: '60px 20px' }}>
    <h2>პროდუქტი ვერ მოიძებნა</h2>
    <p style={{ marginTop: '10px', color: '#666' }}>ეს პროდუქტი წაშლილია ან არ არსებობს.</p>
  </div>;

  return (
    <div className="Container">
      <ProductDetails product={product} />
    </div>
  );
}
