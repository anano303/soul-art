"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";
import { apiClient } from "@/lib/axios";
import { Product } from "@/types";
import { ProductCard } from "@/modules/products/components/product-card";
import "./ExclusivePromoRail.css";

interface ExclusivePromoRailProps {
  maxProducts?: number;
}

export default function ExclusivePromoRail({
  maxProducts = 20,
}: ExclusivePromoRailProps) {
  const { language } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPromoCode, setHasPromoCode] = useState(false);

  useEffect(() => {
    // Check for sales_ref cookie (promo code)
    const salesRef = Cookies.get("sales_ref");
    console.log("[ExclusivePromoRail] sales_ref cookie:", salesRef);

    if (!salesRef || !salesRef.startsWith("SM_")) {
      setHasPromoCode(false);
      setIsLoading(false);
      return;
    }

    setHasPromoCode(true);

    // Fetch products - we'll filter by referralDiscountPercent on client
    const fetchExclusiveProducts = async () => {
      try {
        // Fetch more products and filter on client side
        const response = await apiClient.get("/products", {
          params: {
            limit: 200,
          },
        });

        // API returns 'items' not 'products'
        const allProducts = response.data.items || response.data.products || [];
        console.log(
          "[ExclusivePromoRail] Fetched products:",
          allProducts.length,
        );

        // Filter products that have referral discount > 0
        const productsWithDiscount = allProducts.filter(
          (p: Product) =>
            p.referralDiscountPercent && p.referralDiscountPercent > 0,
        );

        // Shuffle and take maxProducts
        const shuffled = productsWithDiscount.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, maxProducts);

        console.log(
          "[ExclusivePromoRail] Products with referral discount:",
          productsWithDiscount.length,
          "showing:",
          selected.length,
        );

        setProducts(selected);
      } catch (error) {
        console.error("Failed to fetch exclusive products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExclusiveProducts();
  }, [maxProducts]);

  // Don't render if no promo code
  if (!hasPromoCode) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <section className="exclusive-promo-section">
        <div className="exclusive-promo-header">
          <div className="exclusive-promo-icon">
            <Image src="/image.jpg" alt="Gift" width={64} height={64} />
          </div>
          <div className="exclusive-promo-titles">
            <h2 className="exclusive-promo-title">
              {language === "en"
                ? "Loading exclusive deals..."
                : "იტვირთება..."}
            </h2>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="exclusive-promo-section">
      <div className="exclusive-promo-header">
        <div className="exclusive-promo-icon">
          <Image src="/image.jpg" alt="Gift" width={64} height={64} />
        </div>
        <div className="exclusive-promo-titles">
          <h2 className="exclusive-promo-title">
            {language === "en" ? "Exclusive for You!" : "ექსკლუზიურად შენთვის!"}
          </h2>
          <p className="exclusive-promo-subtitle">
            {language === "en"
              ? "Special prices just for you"
              : "განსაკუთრებული ფასები მხოლოდ შენთვის"}
          </p>
        </div>
        <Link href="/shop?promo=true" className="exclusive-view-all">
          {language === "en" ? "View All" : "ყველას ნახვა"} →
        </Link>
      </div>

      <div className="exclusive-products-scroll">
        <div className="exclusive-products-container">
          {products.map((product) => (
            <div key={product._id} className="exclusive-product-wrapper">
              <div
                className="exclusive-card-override"
                style={{
                  width: "100%",
                  // CSS variables won't help here, we need to apply styles through CSS
                }}
              >
                <ProductCard product={product} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
