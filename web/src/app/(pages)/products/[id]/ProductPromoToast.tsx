"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

// Preserves the BOG promo-payment redirect toast that used to live in page.tsx,
// kept as a tiny client island so the product page itself stays server-rendered.
export default function ProductPromoToast() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const promo = searchParams.get("promo");
    if (promo === "success") {
      toast({
        title: "✅ გადახდა წარმატებით შესრულდა!",
        description:
          "რეკლამის მოთხოვნა მიღებულია. რეკლამა გაეშვება მომდევნო 24 საათის განმავლობაში.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (promo === "fail") {
      toast({
        variant: "destructive",
        title: "❌ გადახდა ვერ შესრულდა",
        description: "სცადეთ ხელახლა ან დაუკავშირდით მხარდაჭერას.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams, toast]);

  return null;
}
