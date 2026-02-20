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
import { useCurrency } from "@/hooks/use-currency";
import "./cart-page.css";
import { Color } from "@/types";

export function CartPage() {
  const { items, loading } = useCart();
  const router = useRouter();
  const { t, language } = useLanguage(); // Added language here
  const { shippingAddress } = useCheckout();
  const { currency } = useCurrency();
  const [exchangeRates, setExchangeRates] = useState<{ USD: number; EUR: number } | null>(null);
  const [foreignPaymentFee, setForeignPaymentFee] = useState<number>(20);

  // Force re-render when localStorage changes
  const [, setForceUpdate] = useState(0);

  // Fetch exchange rates and foreign fees on mount
  useEffect(() => {
    const fetchExchangeData = async () => {
      try {
        const [ratesRes, feeRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/exchange-rate/latest`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/foreign-payment-fee`),
        ]);

        if (ratesRes.ok) {
          const data = await ratesRes.json();
          setExchangeRates(data.rates);
        }

        if (feeRes.ok) {
          const data = await feeRes.json();
          setForeignPaymentFee(data.fee || 20);
        }
      } catch (error) {
        console.error("Failed to fetch exchange data:", error);
      }
    };

    fetchExchangeData();
  }, []);

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

  const hasShippingAddress = !!currentShippingAddress?.country;
  const shippingCountry = currentShippingAddress?.country || "";
  const shippingCost = hasShippingAddress ? calculateShipping(shippingCountry, currentShippingAddress?.city) : 0;
  const isShippingFree = hasShippingAddress && shippingCost === 0;

  /**
   * Convert GEL price to user's currency
   * Applies foreign payment fee for non-GEL currencies
   */
  const convertPrice = (gelPrice: number): number => {
    if (currency === "GEL" || !exchangeRates) {
      return gelPrice;
    }

    // Apply foreign payment fee: price * (1 + fee%)
    const priceWithFee = gelPrice * (1 + foreignPaymentFee / 100);

    // Convert to foreign currency
    const rate = exchangeRates[currency];
    if (!rate) return gelPrice;

    return Math.ceil(priceWithFee * rate);
  };

  // Calculate totals in user's currency
  // Convert each item price individually, then multiply by quantity (same as checkout)
  const subtotalInCurrency = items.reduce(
    (acc, item) => acc + convertPrice(item.price) * item.qty,
    0,
  );
  const shippingCostInCurrency = convertPrice(shippingCost);
  const totalInCurrency = subtotalInCurrency + shippingCostInCurrency;

  // Currency symbol
  const currencySymbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₾";

  // Format price with currency symbol
  const formatPrice = (amount: number): string => {
    const formatted = amount.toFixed(2);
    return currency === "USD" ? `${currencySymbol}${formatted}` : `${formatted} ${currencySymbol}`;
  };

  // Format item price (convert from GEL to target currency)
  const formatItemPrice = (gelPrice: number): string => {
    const convertedPrice = convertPrice(gelPrice);
    return formatPrice(convertedPrice);
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
                formatItemPrice={formatItemPrice}
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
                <span>{formatPrice(subtotalInCurrency)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">{t("cart.delivery")}</span>
                <span className="delivery-value">
                  {!hasShippingAddress
                    ? <span className="delivery-at-checkout">{t("cart.calculatedAtCheckout")}</span>
                    : isShippingFree
                    ? <span className="delivery-free">{t("cart.free")}</span>
                    : formatPrice(shippingCostInCurrency)}
                </span>
              </div>
              {!hasShippingAddress && (
                <div className="delivery-note">
                  <span className="delivery-note-icon">🚚</span>
                  <span>{t("cart.tbilisiFreeNote")}</span>
                </div>
              )}
              {/* საკომისიო დაკომენტარებულია
              <div className="summary-row">
                <span className="summary-label">{t("cart.commission")}</span>
                <span>{formatPrice(tax)}</span>
              </div>
              */}
              <hr className="separator" />
              <div className="summary-row total">
                <span>{t("cart.totalCost")}</span>
                <span>{formatPrice(totalInCurrency)}</span>
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
