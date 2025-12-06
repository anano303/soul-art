"use client";

import { useState, useEffect } from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/modules/cart/context/cart-context";
import { useRouter, usePathname } from "next/navigation";
import "./floating-cart-icon.css";

export function FloatingCartIcon() {
  const router = useRouter();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  let cartData;
  try {
    cartData = useCart();
  } catch (error) {
    // თუ CartProvider არ არის available, უბრალოდ არაფერი რენდერი
    console.log("FloatingCartIcon: CartProvider not available");
    return null;
  }

  const { items, totalItems } = cartData;
  const [showTooltip, setShowTooltip] = useState(false);

  // ფუნქცია რომ განვსაზღვროთ არის თუ არა cart-related გვერდზე
  const isOnCartRelatedPage = () => {
    if (!pathname) return false;
    return (
      pathname.startsWith("/cart") ||
      pathname.startsWith("/checkout") ||
      pathname.startsWith("/orders")
    );
  };

  // აჩვენე მხოლოდ მაშინ როცა:
  // 1. კალათაში რამე არის
  // 2. არ ვართ კალათის/checkout/orders გვერდებზე
  useEffect(() => {
    const shouldShow = totalItems > 0 && !isOnCartRelatedPage();
    
    if (shouldShow && !isVisible) {
      setIsAnimatingOut(false);
      setIsVisible(true);
    } else if (!shouldShow && isVisible) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimatingOut(false);
      }, 200);
      return () => clearTimeout(timer);
    }

    // Show tooltip for 3 seconds when cart is updated
    if (shouldShow && totalItems > 0) {
      setShowTooltip(true);
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [totalItems, pathname]);
  
  const handleClick = () => {
    router.push("/cart");
  };

  if (!isVisible) return null;

  return (
    <div
      className={`floating-cart-icon ${isAnimatingOut ? 'animate-out' : 'animate-in'}`}
      onClick={handleClick}
      data-cart-toggle="true"
    >
      {/* Tooltip */}
      {showTooltip && (
        <div className="floating-cart-tooltip animate-tooltip">
          გადადი კალათში 🛒
        </div>
      )}

      <div className="cart-icon-wrapper">
        <ShoppingCart className="cart-icon" />
        {totalItems > 0 && (
          <div className="cart-badge animate-badge">
            {totalItems > 99 ? "99+" : totalItems}
          </div>
        )}
      </div>

      {/* Ripple effect */}
      <div className="cart-ripple"></div>
    </div>
  );
}
