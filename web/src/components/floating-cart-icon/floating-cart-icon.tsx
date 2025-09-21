"use client";

import { useState, useEffect } from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/modules/cart/context/cart-context";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import "./floating-cart-icon.css";

export function FloatingCartIcon() {
  const router = useRouter();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  let cartData;
  try {
    cartData = useCart();
  } catch (error) {
    // თუ CartProvider არ არის available, უბრალოდ არაფერი რენდერი
    console.log("FloatingCartIcon: CartProvider not available");
    return null;
  }

  const { items, totalItems } = cartData;

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
    setIsVisible(shouldShow);
  }, [totalItems, pathname]);
  const handleClick = () => {
    router.push("/cart");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 25,
          }}
          className="floating-cart-icon"
          onClick={handleClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <div className="cart-icon-wrapper">
            <ShoppingCart className="cart-icon" />
            {totalItems > 0 && (
              <motion.div
                className="cart-badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                {totalItems > 99 ? "99+" : totalItems}
              </motion.div>
            )}
          </div>

          {/* Ripple effect */}
          <div className="cart-ripple"></div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
