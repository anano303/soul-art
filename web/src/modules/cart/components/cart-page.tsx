"use client";

import { useState, useEffect } from "react";
import { useCart } from "../context/cart-context";
import { CartEmpty } from "./cart-empty";
import { CartItem } from "./cart-item";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useCheckout } from "@/modules/checkout/context/checkout-context";
import { calculateShipping } from "@/lib/shipping";
import { trackViewCart } from "@/lib/ga4-analytics";
import "./cart-page.css";
import { Color } from "@/types";

export function CartPage() {
  const { items, loading } = useCart();
  const router = useRouter();
  const { t, language } = useLanguage(); // Added language here
  const { shippingAddress } = useCheckout();

  // Force re-render when localStorage changes
  const [, setForceUpdate] = useState(0);

  // Track cart view
  useEffect(() => {
    if (items.length > 0 && !loading) {
      const cartTotal = items.reduce(
        (sum, item) => sum + item.price * item.qty,
        0
      );
      trackViewCart(cartTotal, items.length);
    }
  }, [items, loading]);

  useEffect(() => {
    const handleStorageChange = () => {
      setForceUpdate((prev: number) => prev + 1);
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for checkout context changes
    const interval = setInterval(() => {
      const stored = localStorage.getItem("checkout_shipping_address");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.country !== shippingAddress?.country) {
            setForceUpdate((prev: number) => prev + 1);
          }
        } catch {
          // ignore
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [shippingAddress?.country]);

  // Fetch all colors for proper nameEn support
  const { data: availableColors = [] } = useQuery<Color[]>({
    queryKey: ["colors"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth("/categories/attributes/colors");
        if (!response.ok) {
          return [];
        }
        return response.json();
      } catch {
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  }); // Get localized color name based on current language (exact same logic as product-details.tsx)
  const getLocalizedColorName = (colorName: string): string => {
    if (language === "en") {
      // Find the color in availableColors to get its English name
      const colorObj = availableColors.find(
        (color) => color.name === colorName
      );
      return colorObj?.nameEn || colorName;
    }
    return colorName;
  };

  if (loading) {
    return <div>{t("shop.loading")}</div>;
  }

  if (items.length === 0) {
    return <CartEmpty />;
  }

  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);

  // Calculate shipping based on selected country
  // Get the latest shipping address from localStorage if context is stale
  let currentShippingAddress = shippingAddress;
  try {
    const stored = localStorage.getItem("checkout_shipping_address");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.country) {
        currentShippingAddress = parsed;
      }
    }
  } catch {
    // Use context fallback
  }

  const shippingCountry = currentShippingAddress?.country || "GE"; // Default to Georgia
  const shippingCost = calculateShipping(shippingCountry);
  const isShippingFree = shippingCost === 0;
  const showBothCurrencies = shippingCountry !== "GE";

  // საკომისიო (2%) - არ ჩანს UI-ში, მაგრამ BOG-ში ემატება
  const tax = Number((0.02 * subtotal).toFixed(2));
  // UI-ში ნაჩვენები ჯამი (საკომისიოს გარეშე)
  const total = subtotal + shippingCost;

  // USD conversion rate (1 GEL = 1/2.8 USD approximately)
  const GEL_TO_USD = 1 / 2.8;

  // Function to format price based on country selection
  const formatPrice = (amount: number) => {
    if (showBothCurrencies) {
      return `${amount.toFixed(2)} ₾ ($${(amount * GEL_TO_USD).toFixed(2)})`;
    }
    return `${amount.toFixed(2)} ₾`;
  };

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1 className="cart-title">{t("cart.yourCart")}</h1>
        <p className="cart-items-count">
          {items.length} {t("cart.items")}
        </p>
      </div>

      <div className="cart-content">
        {" "}
        <div className="cart-items">
          {items.map((item) => {
            return (
              <CartItem
                key={`${item.productId}-${item.color ?? "c"}-${
                  item.size ?? "s"
                }-${item.ageGroup ?? "a"}`}
                item={item}
                getLocalizedColorName={getLocalizedColorName}
              />
            );
          })}
        </div>
        <div className="order-summary">
          <div className="summary-card">
            <h2 className="summary-title">{t("cart.checkout")}</h2>
            <div className="summary-details">
              <div className="summary-row">
                <span className="summary-label">{t("cart.total")}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">{t("cart.delivery")}</span>
                <span>
                  {isShippingFree ? t("cart.free") : formatPrice(shippingCost)}
                </span>
              </div>
              {/* საკომისიო დაკომენტარებულია
              <div className="summary-row">
                <span className="summary-label">{t("cart.commission")}</span>
                <span>{formatPrice(tax)}</span>
              </div>
              */}
              <hr className="separator" />
              <div className="summary-row total">
                <span>{t("cart.totalCost")}</span>
                <span>{formatPrice(total)}</span>
              </div>
              <button
                className="checkout-button"
                onClick={() => router.push("/checkout/streamlined")}
              >
                {t("cart.checkout")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
